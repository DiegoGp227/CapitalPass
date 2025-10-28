import FormRegister from "../../forms/FormRegister";
interface FormLoginProps {
  setStateNew: () => void;
}

const Register = ({ setStateNew }: FormLoginProps) => {
  return <FormRegister setStateNew={setStateNew} />;
};

export default Register;
