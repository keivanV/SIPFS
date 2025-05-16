import React, { useState } from "react";
import { FaKey, FaTags, FaSearch, FaTrash } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import ClipLoader from "react-spinners/ClipLoader";

const handleError = (error) => {
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data.message || "An error occurred";

    if (status === 403) {
      toast.error("Access denied: " + message);
    } else if (status === 400) {
      toast.error("Bad request: " + message);
    } else {
      toast.error("Server error: " + message);
    }
  } else if (error.request) {
    toast.error("No response from the server");
  } else {
    toast.error("Request error: " + error.message);
  }
};

const RequestFile = () => {
  const [searchType, setSearchType] = useState("publicKey");
  const [publicKey, setPublicKey] = useState("");
  const [metadata, setMetadata] = useState("");
  const [tags, setTags] = useState([]);
  const [assetId, setAssetId] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});

  const handleRequestPromote = async (fileID, level) => {
    console.log(`handleRequestPromote called with fileID: ${fileID}, level: ${level}`);
    setLoadingStates((prev) => ({ ...prev, [`${fileID}-lvl${level}`]: true }));
    const toastId = toast.info("Requesting promotion...", {
      position: "top-right",
      autoClose: false,
    });

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:4000/promote",
        { fileID, level },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Promote API Response:", response.data);

      if (response.data.success) {
        toast.update(toastId, {
          render: `Promotion to level ${level} successful!`,
          type: "success",
          autoClose: 3000,
        });
      } else {
        toast.update(toastId, {
          render: response.data.message || "Promotion request processed, but requirements not met",
          type: "warning",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Error in promote request:", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to promote file";
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        autoClose: 3000,
      });
    } finally {
      setLoadingStates((prev) => ({ ...prev, [`${fileID}-lvl${level}`]: false }));
    }
  };

  const addTag = (e) => {
    if (e.key === "Enter" && metadata) {
      setTags([...tags, metadata]);
      setMetadata("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleRequestAccess = async (fileId) => {
    setLoadingStates((prev) => ({ ...prev, [fileId]: true }));

    const toastId = toast.info("Requesting access...");

    try {
      const token = localStorage.getItem("token");
      const grantResponse = await axios.post(
        "http://localhost:4000/grantAccess",
        { assetID: fileId },
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );

      if (grantResponse.status === 200) {
        toast.update(toastId, {
          render: "Access granted and file downloaded successfully.",
          type: "success",
          autoClose: 5000,
        });

        const disposition = grantResponse.headers["content-disposition"];
        let filename = fileId;

        if (disposition && disposition.includes("filename=")) {
          const match = disposition.match(/filename\*=UTF-8''(.+)|filename="?([^"]+)"?/);
          if (match) {
            filename = decodeURIComponent(match[1] || match[2]);
          }
        }

        const url = window.URL.createObjectURL(new Blob([grantResponse.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
      }
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        const message = data.error || "An error occurred";

        if (status === 403) {
          toast.update(toastId, {
            render: "Access Denied!",
            type: "error",
            autoClose: 5000,
          });
        } else if (status === 404) {
          toast.update(toastId, {
            render: message,
            type: "warning",
            autoClose: 5000,
          });
        } else {
          toast.update(toastId, {
            render: message,
            type: "error",
            autoClose: 5000,
          });
        }
      } else {
        toast.update(toastId, {
          render: "Network or server error occurred.",
          type: "error",
          autoClose: 5000,
        });
      }
    } finally {
      setLoadingStates((prev) => ({ ...prev, [fileId]: false }));
    }
  };

  const handleSearch = async () => {
    if (
      (searchType === "publicKey" && !publicKey) ||
      (searchType === "metadata" && tags.length === 0) ||
      (searchType === "assetId" && !assetId)
    ) {
      toast.error("Fill the Search field");
      return;
    }

    setLoading(true);
    try {
      let url = "";
      let data = {};

      if (searchType === "publicKey") {
        url = `http://localhost:4000/assets/public-key`;
        const encodedPublicKey = encodeURIComponent(publicKey);
        data = { publicKey: encodedPublicKey };
      } else if (searchType === "metadata") {
        url = `http://localhost:4000/assets/metadata`;
        data.tags = tags;
      } else if (searchType === "assetId") {
        url = `http://localhost:4000/assets`;
        data.assetId = assetId;
      }

      const token = localStorage.getItem("token");
      const response = await axios.post(url, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.data.success) {
        setFiles(response.data.files);
      } else {
        console.log(response.data.error);
      }
    } catch (error) {
      console.log(error.response.data.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen">
      {/* Search panel */}
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl shadow-xl mb-6 mt-20">
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setSearchType("publicKey")}
            className={`py-2 px-4 rounded-l-lg ${searchType === "publicKey" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
          >
            By Public Key
          </button>
          <button
            onClick={() => setSearchType("metadata")}
            className={`py-2 px-4 ${searchType === "metadata" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
          >
            By Metadata
          </button>
          <button
            onClick={() => setSearchType("assetId")}
            className={`py-2 px-4 rounded-r-lg ${searchType === "assetId" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-800"}`}
          >
            By Asset ID
          </button>
        </div>

        <div className="space-y-4">
          {searchType === "publicKey" ? (
            <div>
              <label className="flex items-center mb-2 text-gray-700 font-semibold">
                <FaKey className="mr-2 text-xl text-blue-500" />
                Public Key of Data Owner:
              </label>
              <input
                type="text"
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder="Enter public key"
                className="border border-gray-300 rounded-lg w-full p-4"
              />
            </div>
          ) : searchType === "metadata" ? (
            <div>
              <label className="flex items-center mb-2 text-gray-700 font-semibold">
                <FaTags className="mr-2 text-xl text-purple-500" />
                Enter Metadata Tags:
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  onKeyDown={addTag}
                  placeholder="Press Enter to add tags"
                  className="border border-gray-300 rounded-lg w-full p-4"
                />
              </div>
              <div className="flex flex-wrap mt-2">
                {tags.map((tag, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center mr-2 mt-2">
                    {tag}
                    <FaTrash className="ml-2 cursor-pointer text-red-600" onClick={() => removeTag(tag)} />
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="flex items-center mb-2 text-gray-700 font-semibold">
                <FaSearch className="mr-2 text-xl text-green-500" />
                Enter Asset ID:
              </label>
              <input
                type="text"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="Enter asset ID"
                className="border border-gray-300 rounded-lg w-full p-4"
              />
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          className="w-full bg-blue-600 text-white py-3 rounded-lg mt-6"
          disabled={loading}
        >
          {loading ? <ClipLoader size={24} color="#ffffff" /> : "Search"}
        </button>
      </div>

      {/* Files list with fixed height and overflow */}
      <div className="w-full max-w-6xl flex flex-wrap justify-start gap-4 p-4" style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {files.map((file, index) => (
          <div key={index} className="bg-gray-100 rounded-lg shadow-md p-4 w-64 mb-4">
            <h2 className="text-lg font-semibold">File ID: {file.ID}</h2>
            <div className="mt-2">
              <details>
                <summary className="cursor-pointer text-blue-600">Show Metadata</summary>
                <div className="text-sm mt-2 text-gray-700">
                  {Array.isArray(file.MetaData)
                    ? file.MetaData.join(", ")
                    : typeof file.MetaData === "string"
                    ? (() => {
                        try {
                          const parsedMetaData = JSON.parse(file.MetaData);
                          if (Array.isArray(parsedMetaData)) return parsedMetaData.join(", ");
                          if (typeof parsedMetaData === "string" && parsedMetaData.startsWith("[") && parsedMetaData.endsWith("]")) {
                            const innerArray = JSON.parse(parsedMetaData);
                            return Array.isArray(innerArray) ? innerArray.join(", ") : parsedMetaData;
                          }
                          return parsedMetaData;
                        } catch (error) {
                          return "Invalid metadata";
                        }
                      })()
                    : "No valid metadata"}
                </div>
              </details>
            </div>

            {/* Buttons Section */}
            {file.type === "DEMO" ? (
              <button
                className={`mt-4 w-full ${loadingStates[file.ID] ? "bg-gray-400" : "bg-green-600"} text-white py-2 rounded-lg`}
                onClick={() => handleRequestAccess(file.ID)}
                disabled={loadingStates[file.ID]}
              >
                {loadingStates[file.ID] ? <ClipLoader size={20} color="#ffffff" /> : "Request"}
              </button>
            ) : (
              <div className="mt-4 space-y-2">
                <button
                  className={`w-full ${loadingStates[file.ID + "-lvl1"] ? "bg-gray-400" : "bg-blue-600"} text-white py-2 rounded-lg`}
                  onClick={() => handleRequestPromote(file.ID, 1)}
                  disabled={loadingStates[file.ID + "-lvl1"]}
                >
                  {loadingStates[file.ID + "-lvl1"] ? <ClipLoader size={20} color="#ffffff" /> : "Request Promote Level 1"}
                </button>
                <button
                  className={`w-full ${loadingStates[file.ID + "-lvl2"] ? "bg-gray-400" : "bg-purple-600"} text-white py-2 rounded-lg`}
                  onClick={() => handleRequestPromote(file.ID, 2)}
                  disabled={loadingStates[file.ID + "-lvl2"]}
                >
                  {loadingStates[file.ID + "-lvl2"] ? <ClipLoader size={20} color="#ffffff" /> : "Request Promote Level 2"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequestFile;