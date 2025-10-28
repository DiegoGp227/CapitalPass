import Image from "next/image";
import Nav from "../molecules/Nav";
const Header = () => {
  return (
    <header className="bg-white shadow p-6 rounded-b-lg mb-10 flex justify-between items-center">
      <div>
        <Image
          src="/image/capitalpass.png"
          alt="Capital Pass Logo"
          width={40}
          height={40}
        />
      </div>
      <div className="text-2xl font-bold text-green-600 mx-10">
        Capital Pass
      </div>
      <div className="mx-8">

      </div>
    </header>
  );
};

export default Header;
