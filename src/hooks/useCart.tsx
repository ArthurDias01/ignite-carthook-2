import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productExistsOnCart = updatedCart.find((product) => productId === product.id);

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExistsOnCart ? productExistsOnCart.amount : 0;
      const amount = currentAmount + 1; //nova qtdade após adicao

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExistsOnCart) { // atualiza o valor do produto no carrinho caso ele exista
        productExistsOnCart.amount = amount;
      } else { // caso não exista no carrinho pega o produto pelo id na API e q retorna sem o amount e adiciona a propriedade amount no mesmo. Após adicionar a propriedade, adiciona o produto com qtdade no array do carrinho atualizado.
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1
        }
        updatedCart.push(newProduct)
      }
      setCart(updatedCart) // atualiza o estado do carrinho
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart)); //atualiza o local storage com carrinho depois da adição do produto
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex((product) => productId === product.id);// retorna -1 caso não encontre o produto do carrinho com o mesmo id que o productId entrado na função
      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1); //remove dentro do array somente o elemento de indice (productIndex) encontrado, o 1 é pra especificar quantos elementos serão retirados do array a partir do indice(productIndex).
        setCart(updatedCart); // atualiza o estado do carrinho
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));// atualiza o carrinho no localstorage
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //checa qtdade do item se não constar no carrinho sai da função return ''
      if (amount <= 0) {
        return;
      }
      // busca na API a qtdade disponivel total
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;

      //verifica se a quantidade atual é maior q a do estoque
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      // caso exista quantidade ainda q possa ser adicionada executa:
      const updatedCart = [...cart];
      const productExistsOnCart = updatedCart.find(product => product.id === productId); // busca o produto no carrinho e retorna ele como objeto caso exista

      if (productExistsOnCart) {// caso produto já conste no carrinho atualiza a qtdade no carrinho
        productExistsOnCart.amount = amount;
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
