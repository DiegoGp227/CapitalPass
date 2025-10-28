"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FormLogin from "../forms/FormLogin";
import FormRegister from "../forms/FormRegister";

export default function AuthPage() {
  const [state, setState] = useState("login");

  return (
    <div className="flex justify-center items-center w-full min-h-screen px-4">
      <AnimatePresence mode="wait">
        {state === "register" ? (
          <motion.div
            key="register"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-lg"
          >
            <FormRegister setStateNew={() => setState("login")} />
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full max-w-lg"
          >
            <FormLogin setStateNew={() => setState("register")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
