"use client";
import Login from "./components/orgamins/Login";
import Register from "./components/orgamins/Registes";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [state, setState] = useState("login");

  return (
    <div className="flex justify-center items-center md:flex md:flex-col md:items-end md:justify-end w-full h-full p-0">
      <div className="h-full w-full">
        <AnimatePresence mode="wait">
          {state === "register" ? (
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full w-full"
            >
              <Register setStateNew={() => setState("login")} />
            </motion.div>
          ) : (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full w-full"
            >
              <Login setStateNew={() => setState("register")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
