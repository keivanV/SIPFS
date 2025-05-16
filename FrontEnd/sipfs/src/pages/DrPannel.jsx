import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";
import { FaFileAlt, FaUserShield, FaCopy } from "react-icons/fa";
import sipfsLogo from "../assets/sipfs-logo.png";
import RequestFile from "./DrPannelOptions/RequestFile";
import { faFolder, faSignOutAlt, faTimes } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Bind modal to app element for accessibility


const DrPannel = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const [activeButton, setActiveButton] = useState("requestFile");
  const [cid, setCid] = useState("");
  const [promoteFileID, setPromoteFileID] = useState("");
  const [fileData, setFileData] = useState(null);
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleButtonClick = (buttonName) => {
    console.log(`Button clicked: ${buttonName}`);
    setActiveButton(buttonName);
  };

  const handleSearch = async () => {
    if (!cid) return;
    try {
      const response = await axios.get(`http://localhost:4000/assets/cid/${cid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data && response.data.success) {
        const fileId = response.data.file.fileId;
        const assetResponse = await axios.get(`http://localhost:4000/assets/${fileId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setFileData(assetResponse.data);
        setIsFileModalOpen(true);
      } else {
        toast.error(response.data.message || "Failed to fetch file");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error fetching file");
    } finally {
      setCid("");
    }
  };

  const handlePromoteRequest = async () => {
    console.log("handlePromoteRequest called with fileID:", promoteFileID);
    if (!promoteFileID) {
      console.log("No File ID provided");
      toast.error("Please enter a File ID.");
      return;
    }

    const toastId = toast.info("Sending promote request...", {
      position: "top-right",
      autoClose: false,
    });

    try {
      console.log("Sending POST to http://localhost:4000/promote");
      const response = await axios.post(
        "http://localhost:4000/promote",
        { fileID: promoteFileID, level: "FULL" },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      console.log("API Response:", response.data);

      if (response.data.success) {
        toast.update(toastId, {
          render: "Promote request sent successfully!",
          type: "success",
          autoClose: 3000,
        });
        setPromoteFileID("");
      } else {
        toast.update(toastId, {
          render: response.data.message || "Promotion processed, but requirements not met",
          type: "warning",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Error in promote request:", error);
      toast.update(toastId, {
        render: error.response?.data?.message || "Failed to send promote request",
        type: "error",
        autoClose: 3000,
      });
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch((err) => console.error("Failed to copy: ", err));
  };

  return (
    <div className="flex h-screen bg-gray-200 overflow-hidden">
      {/* Sidebar */}
      <div className="w-96 bg-gray-800 text-white flex flex-col justify-between py-6 px-4">
        <div className="space-y-6">
          <div className="flex justify-center mt-6">
            <img src={sipfsLogo} alt="SIPFS Logo" className="w-36" />
          </div>
          <h2 className="text-xl font-semibold mb-4 text-center">Data Requester Panel</h2>

          <button
            className={`flex items-center space-x-2 py-3 px-5 rounded transition duration-200 w-full ${
              activeButton === "requestFile" ? "bg-[#4C82E2]" : "bg-[#3B3F47]"
            }`}
            onClick={() => handleButtonClick("requestFile")}
          >
            <FaFileAlt className="text-white" />
            <span>Request File</span>
          </button>

          <button
            className={`flex items-center space-x-2 py-3 px-5 rounded transition duration-200 w-full ${
              activeButton === "promoteRequest" ? "bg-[#4C82E2]" : "bg-[#3B3F47]"
            }`}
            onClick={() => handleButtonClick("promoteRequest")}
          >
            <FaUserShield className="text-white" />
            <span>Promote Request</span>
          </button>

          <button
            className={`flex items-center space-x-2 py-3 px-5 rounded transition duration-200 w-full ${
              activeButton === "requestOwnership" ? "bg-[#4C82E2]" : "bg-[#3B3F47]"
            }`}
            onClick={() => handleButtonClick("requestOwnership")}
          >
            <FaUserShield className="text-white" />
            <span>Request Ownership</span>
          </button>

          <button
            className={`flex items-center space-x-2 py-3 px-5 rounded transition duration-200 w-full ${
              activeButton === "myAssets" ? "bg-[#4C82E2]" : "bg-[#3B3F47]"
            }`}
            onClick={() => handleButtonClick("myAssets")}
          >
            <FontAwesomeIcon icon={faFolder} className="text-white" />
            <span>My Assets</span>
          </button>
        </div>

        <div className="mt-5">
          <button
            onClick={() => navigate("/")}
            className="py-3 px-5 w-full flex items-center bg-red-500 hover:bg-red-600 text-white rounded-lg transition duration-200"
          >
            <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" /> Logout
          </button>
        </div>

        <div className="w-11/12 mt-1">
          {[
            { name: "IPFS", status: true },
            { name: "Hyperledger Fabric", status: true },
            { name: "MongoDB", status: true },
          ].map((service, index) => (
            <div key={index} className="flex items-center justify-between text-sm text-white mt-2">
              <span>{service.name}</span>
              <div className={`w-3 h-3 rounded-full ${service.status ? "bg-green-500" : "bg-red-500"}`}></div>
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-200">version 1.0 beta</div>
      </div>

      {/* Main Content Area */}
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
        </div>

        {activeButton === "requestFile" && <RequestFile />}
        {activeButton === "promoteRequest" && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-4">Promote Request</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">File ID:</label>
                <input
                  type="text"
                  value={promoteFileID}
                  onChange={(e) => setPromoteFileID(e.target.value)}
                  placeholder="Enter File ID"
                  className="border rounded p-2 w-full bg-gray-50 hover:bg-gray-100"
                />
              </div>
              <button
                onClick={() => {
                  console.log("Send Promote Request button clicked");
                  handlePromoteRequest();
                }}
                className="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600"
              >
                Send Promote Request
              </button>
            </div>
          </div>
        )}
      </div>

      {/* File Information Modal */}
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
                {copySuccess && (
                  <span className="ml-2 text-green-500">Public key copied successfully!</span>
                )}
              </p>
            </div>
          ) : (
            <p>No file data available.</p>
          )}
        </div>
      </Modal>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ zIndex: 10001 }}
      />
    </div>
  );
};

export default DrPannel;