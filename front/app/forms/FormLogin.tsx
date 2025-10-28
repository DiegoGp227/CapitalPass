"use client";
import { useForm } from "react-hook-form";
import Image from "next/image";
import TrasmiImage from "../../public/image/capitalpass.png";
import { useRouter } from "next/navigation";
import Button from "@/app/components/atoms/Button";
interface FormLoginProps {
  setStateNew: () => void;
}
interface IFormData {
  name: string;
  password: string;
}

const FormLogin = ({ setStateNew }: FormLoginProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const router = useRouter();

  const handleOnSubmit = (data: IFormData) => {
    console.log(data);
  };
  return (
    <>
      <form
        action=""
        onSubmit={handleSubmit(()=>{handleOnSubmit})}
        className="flex flex-col justify-center items-center w-full p-8 rounded-3xl shadow-2xl z-10 bg-white"
      >
        <Image
          src={TrasmiImage}
          alt="Capital Pass Logo"
          width={60}
          height={60}
          className="m-0"
        />
        <h2 className="text-3xl m-4 mb-10">Inicia sesión</h2>
        <div className="flex flex-col gap-2 w-full">
          <input
            className="border-green-300 w-full border-2 rounded-2xl p-3 focus:outline-none focus:border-green-500"
            placeholder="name"
            type="text"
            {...register("name", {
              required: { value: true, message: "Name is required" },
            })}
          />
          <p className="text-red-400 text-center">{errors.name?.message as string}</p>
          <input
            className="border-green-300 w-full border-2 rounded-2xl p-3 focus:outline-none focus:border-green-500"
            placeholder="password"
            type="password"
            {...register("password", {
              required: { value: true, message: "Password is required" },
            })}
          />
          <p className="text-red-400 text-center">{errors.password?.message as string}</p>
        </div>

        <Button
          ClassName="mt-12"
          onClick={() => {
            router.push("/dashboard");
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="#fff"
              d="M20.04 2.323c1.016-.355 1.992.621 1.637 1.637l-5.925 16.93c-.385 1.098-1.915 1.16-2.387.097l-2.859-6.432l4.024-4.025a.75.75 0 0 0-1.06-1.06l-4.025 4.024l-6.432-2.859c-1.063-.473-1-2.002.097-2.387z"
            />
          </svg>
          iniciar sesion
        </Button>
        <p
          className="text-gray-600 mt-4 underline cursor-pointer transition: hover:text-gray-400"
          onClick={() => setStateNew()}
        >
          Registrarte
        </p>
      </form>
    </>
  );
};

export default FormLogin;
