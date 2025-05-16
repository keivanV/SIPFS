//============= v2 ===================
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import UploadFiles from "./DoPannelOptions/UploadFiles";
import ManageFiles from "./DoPannelOptions/ManageFiles";
import InfoPanel from "./DoPannelOptions/InfoPanel";
import Version from "./DoPannelOptions/Version";
import secureIpfsLogo from "../assets/sipfs-logo.png";
import Modal from "react-modal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { faInfoCircle, faUpload, faFolder, faSignOutAlt, faQuestionCircle, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FaCopy } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify"; // Importing ToastContainer and toast
import "react-toastify/dist/ReactToastify.css"; // Importing CSS for Toast notifications

Modal.setAppElement("#root");

const DoPannel = () => {
  const [activeComponent, setActiveComponent] = useState("upload");
  const [user, setUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [cid, setCid] = useState("");
  const [fileData, setFileData] = useState(null);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleSearch = async () => {
    if (!cid) {
        console.error("CID is empty");
        return; 
    }

    try {
        const response = await axios.get(`http://localhost:4000/assets/cid/${cid}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        console.log("Search result:", response.data);

    } catch (error) {
        console.error("Search error:", error.response ? error.response.data.error : error.message);
        alert("Error: " + (error.response ? error.response.data.error : error.message)); 
    } finally {
        setCid(""); 
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.info("Public key copied to clipboard!");

    }).catch((err) => {
      toast.error('Failed to copy: ', err);
    });
  };

  const renderComponent = () => {
    switch (activeComponent) {
      case "upload":
        return <UploadFiles />;
      case "manage":
        return <ManageFiles />;
      case "info":
        return <InfoPanel />;

      case "version":
        return <Version/>;

      default:
        return <UploadFiles />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/4 bg-[#2A2D34] flex flex-col items-center py-10 shadow-lg">
        <img src={secureIpfsLogo} alt="Secure-IPFS Logo" className="w-36 h-auto mb-8" />
        <h1 className="text-xl font-semibold mb-6 text-white">Data Owner Panel</h1>

        <button
          onClick={() => setActiveComponent("upload")}
          className={`py-3 px-4 mb-4 w-11/12 flex items-center rounded-lg text-left ${
            activeComponent === "upload" ? "bg-[#4C82E2] text-white" : "bg-[#3B3F47] text-gray-300"
          } hover:bg-[#4C82E2] transition duration-200`}
        >
          <FontAwesomeIcon icon={faUpload} className="mr-2" />
          Upload Files
        </button>

        <button
          onClick={() => setActiveComponent("manage")}
          className={`py-3 px-4 mb-4 w-11/12 flex items-center rounded-lg text-left ${
            activeComponent === "manage" ? "bg-[#4C82E2] text-white" : "bg-[#3B3F47] text-gray-300"
          } hover:bg-[#4C82E2] transition duration-200`}
        >
          <FontAwesomeIcon icon={faFolder} className="mr-2" />
          Manage Files
        </button>


        <button
          onClick={() => setActiveComponent("version")}
          className={`py-3 px-4 mb-4 w-11/12 flex items-center rounded-lg text-left ${
            activeComponent === "version" ? "bg-[#4C82E2] text-white" : "bg-[#3B3F47] text-gray-300"
          } hover:bg-[#4C82E2] transition duration-200`}
        >
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
          Version Tracking
        </button>



        <button
          onClick={() => setActiveComponent("info")}
          className={`py-3 px-4 mb-4 w-11/12 flex items-center rounded-lg text-left ${
            activeComponent === "info" ? "bg-[#4C82E2] text-white" : "bg-[#3B3F47] text-gray-300"
          } hover:bg-[#4C82E2] transition duration-200`}
        >
          <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
          Info
        </button>

        <button
          onClick={() => navigate("/")}
          className="py-3 px-4 mt-auto w-11/12 flex items-center bg-red-600 hover:bg-red-700 text-white rounded-lg transition duration-200"
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" /> Logout
        </button>


        <div className="w-11/12 mt-4">
          {[
            { name: 'IPFS', status: true },
            { name: 'Hyperledger Fabric', status: true },
            { name: 'MongoDB', status: true }
          ].map((service, index) => (
            <div key={index} className="flex items-center justify-between text-sm text-white mt-2">
              <span>{service.name}</span>
              <div className={`w-3 h-3 rounded-full ${service.status ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-200 mt-5">version 1.0 beta</div>
      </div>


      {/* Main Content */}
      <div className="w-3/4 bg-gray-200 p-10 overflow-auto">
        <div className="flex justify-between items-center bg-white shadow-md rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="CID Hash Search ..."
              value={cid}
              onChange={(e) => setCid(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none"
            />
            <button onClick={handleSearch} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              Search
            </button>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="text-blue-500 hover:text-blue-700">
            <FontAwesomeIcon icon={faQuestionCircle} size="lg" />
          </button>
        </div>

        <div className="bg-white shadow-md rounded-lg p-8">
          {renderComponent()}
        </div>
      </div>


      <Modal
          isOpen={isModalOpen}
          onRequestClose={() => setIsModalOpen(false)}
          className="fixed inset-0 flex items-center justify-center p-4"
          overlayClassName="fixed inset-0 bg-black bg-opacity-40"
        >
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-red-500 hover:text-red-700 transition duration-300 ease-in-out"
            >
              <FontAwesomeIcon icon={faTimes} size="lg" />
            </button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Welcome to the File Upload Portal</h2>
            <p className="text-gray-600 mb-4">
              We’re excited to have you here! In this portal, you can upload your files to IPFS securely and easily.
            </p>
            <p className="text-gray-600">
              Only registered users who meet the access requirements will be able to view and interact with your files.
            </p>
          </div>
      </Modal>


      <Modal
        isOpen={isFileModalOpen}
        onRequestClose={() => setIsFileModalOpen(false)}
        className="fixed inset-0 flex items-center justify-center p-4"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50"
      >
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full relative">
          <button
            onClick={() => setIsFileModalOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <FontAwesomeIcon icon={faTimes} size="lg" />
          </button>
          <h2 className="text-lg font-semibold mb-4">File Information</h2>
          {fileData ? (
              <div>
                <p><strong>File ID:</strong> {fileData.ID}</p>
                <div>
                  <strong>MetaData:</strong>
                  <div className="flex flex-wrap mt-2">
                    {JSON.parse(fileData.MetaData).map((meta, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 text-sm font-medium mr-2 mb-2 px-2.5 py-0.5 rounded">
                        {meta}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="flex items-center">
                  <strong>Public Key:</strong>
                  <button
                    onClick={() => copyToClipboard(fileData.publicKeyOwner)}
                    className="ml-2 text-blue-500 hover:text-blue-700 flex items-center"
                  >
                    <FaCopy className="mr-1" /> Copy
                  </button>
                </p>
              </div>
            ) : (
              <p>No file data available.</p>
          )}
        </div>
      </Modal>

      
    </div>
  );
};

export default DoPannel;

// ============================================