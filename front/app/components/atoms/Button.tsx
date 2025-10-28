interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  ClassName?: string;
}

const Button = ({ children, onClick, ClassName }: ButtonProps) => {
  return (
    <button
      className={`bg-green-400 text-black flex gap-2 font-bold py-3 px-8 rounded-2xl hover:bg-green-300 cursor-pointer shadow-lg justify-center items-center ${ClassName}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
