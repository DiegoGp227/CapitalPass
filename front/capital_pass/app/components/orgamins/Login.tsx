import FormLogin from "../../forms/FormLogin";

interface LoginProps {
  setStateNew: () => void;
}

const login = ({ setStateNew }: LoginProps) => {
  return (
    <>
      <FormLogin setStateNew={setStateNew} />
    </>
  );
};

export default login;
