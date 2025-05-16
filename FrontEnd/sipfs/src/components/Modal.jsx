import React from "react";
import { FaTimes } from "react-icons/fa";

const Modal = ({ onClose, children }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
      <div className="relative bg-gray-800 text-white rounded-lg shadow-lg p-6 w-11/12 max-w-lg mx-auto">
        <button onClick={onClose} className="absolute top-3 right-3 text-red-500 hover:text-red-600">
          <FaTimes />
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
