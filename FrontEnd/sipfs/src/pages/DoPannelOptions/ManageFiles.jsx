import React, { useEffect, useState } from "react";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FaEdit, FaTrash, FaExchangeAlt, FaInfoCircle, FaBan, FaChevronLeft, FaChevronRight, FaUndo, FaArrowDown } from "react-icons/fa";
import { format } from 'date-fns';
import Select from "react-select";

const ManageFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFile, setExpandedFile] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentFile, setCurrentFile] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 20;

  const indexOfLastFile = currentPage * filesPerPage;
  const indexOfFirstFile = indexOfLastFile - filesPerPage;
  const currentFiles = files.slice(indexOfFirstFile, indexOfLastFile);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const interestsOptions = [
    { value: "Web Design", label: "Web Design" },
    { value: "Windows Development", label: "Windows Development" },
    { value: "Mobile Apps", label: "Mobile Apps" },
    { value: "AI and Machine Learning", label: "AI and Machine Learning" },
    { value: "Cybersecurity", label: "Cybersecurity" },
  ];

  const languagesOptions = [
    { value: "Java", label: "Java" },
    { value: "Python", label: "Python" },
    { value: "JavaScript", label: "JavaScript" },
    { value: "C++", label: "C++" },
    { value: "Ruby", label: "Ruby" },
  ];

  const [updatedData, setUpdatedData] = useState({
    metaData: [],
    policySet: [],
    promoteAttributes: [],
    newMetaTag: ''
  });

  useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      const token = localStorage.getItem('token');
      try {
        const response = await axios.get("http://localhost:4000/assets", {
          headers: { "Authorization": `Bearer ${token}` },
        });
        if (response.data && response.data.files) {
          setFiles(response.data.files);
          console.log(response.data.files);
        } else {
          toast.error(response.data.message || "Failed to fetch files");
        }
      } catch (error) {
        toast.error(error.response?.data?.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, []);

  const toggleInfo = (fileId) => {
    setExpandedFile((prev) => (prev === fileId ? null : fileId));
  };

  const handleUpdate = (file) => {
    setCurrentFile(file);
    let metadataTemp = Array.isArray(file.MetaData) ? file.MetaData : JSON.parse(file.MetaData || '[]');
    if (typeof metadataTemp === 'string') {
      metadataTemp = JSON.parse(metadataTemp);
    }
    const metadata = Array.isArray(metadataTemp) ? metadataTemp : [metadataTemp];
    const policySet = Array.isArray(file.policySet) ? file.policySet : [{}];
    const promoteAttributes = Array.isArray(file.promoteAttributes)
      ? file.promoteAttributes.map(attr => ({
          interest: Array.isArray(attr.interest) ? attr.interest : [],
          languages: Array.isArray(attr.languages) ? attr.languages : []
        }))
      : [{ interest: [], languages: [] }];

    setUpdatedData({
      metaData: metadata,
      policySet: policySet,
      promoteAttributes: promoteAttributes,
      newMetaTag: ''
    });
    setIsUpdating(true);
  };

  const handleSubmitUpdate = async (fileId) => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading("Updating Asset...");
    try {
      const response = await axios.put(`http://localhost:4000/assets/${fileId}`, {
        metaData: updatedData.metaData,
        policySet: updatedData.policySet,
        promoteAttributes: updatedData.promoteAttributes
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        toast.update(toastId, { render: "Asset Updated Successfully", type: "success", isLoading: false, autoClose: 3000 });
        setFiles(files.map(file => (file.ID === fileId ? { ...file, ...updatedData } : file)));
        setIsUpdating(false);
      } else {
        throw new Error(response.data.message || "Update failed");
      }
    } catch (error) {
      toast.update(toastId, { render: "An error occurred", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  const handleCancelUpdate = () => {
    setIsUpdating(false);
  };

  const handleBlockUser = async (fileId, requesterUsername) => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading(`Blocking user ${requesterUsername}...`);
    try {
      const response = await axios.post(`http://localhost:4000/assets/blockUser`, {
        fileId,
        requesterUsername
      }, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.data.success) {
        toast.update(toastId, { render: `${requesterUsername} blocked successfully`, type: "success", isLoading: false, autoClose: 3000 });
        setFiles((prevFiles) =>
          prevFiles.map((file) =>
            file.ID === fileId
              ? {
                  ...file,
                  requesters: file.requesters.map((requester) =>
                    requester.username === requesterUsername
                      ? { ...requester, revoked: true }
                      : requester
                  ),
                }
              : file
          )
        );
      } else {
        throw new Error(response.data.message || "Failed to block user");
      }
    } catch (error) {
      toast.update(toastId, { render: error.response?.data?.message || "An error occurred", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  const handleRestoreAccess = async (fileId, requesterUsername) => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading(`Restoring access for user ${requesterUsername}...`);
    try {
      const response = await axios.post(`http://localhost:4000/api/restore`, {
        username: requesterUsername,
        assetID: fileId,
        restoredAt: new Date().toISOString()
      }, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.data) {
        toast.update(toastId, { render: `${requesterUsername} access restored successfully`, type: "success", isLoading: false, autoClose: 3000 });
        setFiles((prevFiles) =>
          prevFiles.map((file) =>
            file.ID === fileId
              ? {
                  ...file,
                  requesters: file.requesters.map((requester) =>
                    requester.username === requesterUsername
                      ? { ...requester, revoked: false }
                      : requester
                  ),
                }
              : file
          )
        );
      } else {
        throw new Error(response.data.message || "Failed to restore access");
      }
    } catch (error) {
      toast.update(toastId, { render: error.response?.data?.message || "An error occurred", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  const handleDemoteUser = async (fileId, username) => {
    const token = localStorage.getItem('token');
    const toastId = toast.loading(`Demoting user ${username}...`);
    try {
      const response = await axios.post(`http://localhost:4000/assets/demote`, {
        fileId,
        username
      }, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (response.data.success) {
        toast.update(toastId, { render: `${username} demoted successfully`, type: "success", isLoading: false, autoClose: 3000 });
        setFiles((prevFiles) =>
          prevFiles.map((file) =>
            file.ID === fileId
              ? {
                  ...file,
                  promotedAccess: file.promotedAccess.filter((access) => access.username !== username),
                  revokedAccess: [
                    ...(file.revokedAccess || []),
                    { username, type: 'demotion', demotedAt: new Date().toISOString() }
                  ]
                }
              : file
          )
        );
      } else {
        throw new Error(response.data.message || "Failed to demote user");
      }
    } catch (error) {
      toast.update(toastId, { render: error.response?.data?.message || "An error occurred", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto bg-white rounded-lg shadow-lg border border-gray-300">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-blue-600">Manage Files</h2>
        <div className="flex space-x-2">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            <FaChevronLeft />
          </button>
          <span className="p-2 text-gray-700">{currentPage} / {Math.ceil(files.length / filesPerPage)}</span>
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage * filesPerPage >= files.length}
            className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
      
      {loading ? (
        <p className="text-center text-gray-500">Loading files...</p>
      ) : (
        <div className="space-y-4">
          {currentFiles.length > 0 ? (
            currentFiles.map((file) => {
              let metadataTemp = Array.isArray(file.MetaData) ? file.MetaData : JSON.parse(file.MetaData || '[]');
              if (typeof metadataTemp === 'string') {
                metadataTemp = JSON.parse(metadataTemp);
              }
              const metadata = Array.isArray(metadataTemp) ? metadataTemp : [metadataTemp];
              const policySet = file.policySet || [];
              const promoteAttributes = Array.isArray(file.promoteAttributes) ? file.promoteAttributes : [];
            
              return (
                <div key={file.ID} className="p-4 border rounded-lg bg-gray-100 hover:bg-gray-200 transition duration-200 relative">
                  <div className="flex justify-between items-center text-lg font-semibold text-gray-700">
                    <div className="text-center max-w-[150px] overflow-hidden whitespace-nowrap text-ellipsis" title={file.name}>
                      <span className="text-sm font-semibold text-gray-800 truncate">{file.name}</span>
                      <span className="text-sm text-gray-500 block mt-1">ID : {file.ID}</span>
                    </div>
                    {file.downloadCount == 0 && (
                      <div>
                        <div className="bg-gray-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          version: {file.type || 'demo'}
                        </div>
                      </div>
                    )}
                    {file.downloadCount > 0 && (
                      <div>
                        <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Downloads: {file.downloadCount}
                        </div>
                        <div className="bg-gray-500 mt-2 text-white text-xs font-bold px-2 py-1 rounded-full">
                          version: {file.version || 'demo'}
                        </div>
                      </div>
                    )}
                    <div className="flex space-x-2">
                      <button onClick={() => handleUpdate(file)} className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"><FaEdit /></button>
                      <button onClick={() => toast.info("Transfer functionality not yet implemented")} className="bg-yellow-500 text-white p-2 rounded hover:bg-yellow-600"><FaExchangeAlt /></button>
                      <button onClick={() => toggleInfo(file.ID)} className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600"><FaInfoCircle /></button>
                    </div>
                  </div>
                  {expandedFile === file.ID && (
                    <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                      <div>
                        <strong>Metadata:</strong>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {metadata.map((item, index) => (
                            <span key={index} className="px-3 py-1 rounded-full bg-blue-200 text-blue-700 text-sm">{item}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Policy Set:</strong>
                        <div className="mt-2 p-2 bg-gray-200 text-gray-700 rounded-lg w-full max-w-full overflow-hidden">
                          {Array.isArray(policySet) && policySet.length > 0 ? (
                            <span>
                              {policySet
                                .filter(policy => (policy.interest && policy.interest.length) || (policy.languages && policy.languages.length))
                                .map((policy) => {
                                  const interestStr = policy.interest && policy.interest.length ? policy.interest.join(", ") : "";
                                  const languagesStr = policy.languages && policy.languages.length ? policy.languages.join(", ") : "";
                                  return [interestStr, languagesStr].filter(str => str).join(" - ");
                                })
                                .filter(str => str)
                                .join(", ")}
                            </span>
                          ) : (
                            <span>No policy set defined</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <strong>Promote Attributes:</strong>
                        <div className="mt-2 p-2 bg-gray-200 text-gray-700 rounded-lg w-full max-w-full overflow-hidden">
                          {Array.isArray(promoteAttributes) && promoteAttributes.some(attr => (attr.interest && attr.interest.length) || (attr.languages && attr.languages.length)) ? (
                            <span>
                              {promoteAttributes
                                .filter(attr => (attr.interest && attr.interest.length) || (attr.languages && attr.languages.length))
                                .map((attr) => {
                                  const interestStr = attr.interest && attr.interest.length ? attr.interest.join(", ") : "";
                                  const languagesStr = attr.languages && attr.languages.length ? attr.languages.join(", ") : "";
                                  return [interestStr, languagesStr].filter(str => str).join(" - ");
                                })
                                .filter(str => str)
                                .join(", ")}
                            </span>
                          ) : (
                            <span>No promote attributes defined</span>
                          )}
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded-lg shadow-lg mt-4">
                        <strong className="text-white text-lg">Requests & Promotions:</strong>
                        <div className="mt-2 space-y-3">
                          {file.requesters && file.requesters.length > 0 ? (
                            file.requesters.map((request, index) => (
                              <div key={`req-${index}`} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                                <div className={`w-3 h-3 rounded-full mr-3 ${request.revoked ? 'bg-red-500' : 'bg-green-500'}`} />
                                <span className="text-gray-300">{request.username} (Request)</span>
                                <span className="text-gray-300">{format(new Date(request.downloadDate || request.grantedAt), 'MMMM do, yyyy - h:mm a')}</span>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleBlockUser(file.ID, request.username)}
                                    disabled={request.revoked}
                                    className={`flex text-white items-center space-x-2 ${request.revoked ? 'bg-gray-500 cursor-not-allowed' : 'text-red-500 hover:text-white bg-red-600 hover:bg-red-700'} px-3 py-2 rounded-lg transition-all duration-200`}
                                  >
                                    <FaBan />
                                    <span>Revoke</span>
                                  </button>
                                  <button
                                    onClick={() => handleRestoreAccess(file.ID, request.username)}
                                    disabled={!request.revoked}
                                    className={`flex text-white items-center space-x-2 ${!request.revoked ? 'bg-gray-500 cursor-not-allowed' : 'text-green-500 hover:text-white bg-green-600 hover:bg-green-700'} px-3 py-2 rounded-lg transition-all duration-200`}
                                  >
                                    <FaUndo />
                                    <span>Restore</span>
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : null}
                          {file.promotedAccess && file.promotedAccess.length > 0 ? (
                            file.promotedAccess.map((access, index) => (
                              <div key={`prom-${index}`} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
                                <div className="w-3 h-3 rounded-full mr-3 bg-blue-500" />
                                <span className="text-gray-300">{access.username} (Promoted)</span>
                                <span className="text-gray-300">{format(new Date(access.promotedAt), 'MMMM do, yyyy - h:mm a')}</span>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleDemoteUser(file.ID, access.username)}
                                    className="flex text-white items-center space-x-2 text-yellow-500 hover:text-white bg-yellow-600 hover:bg-yellow-700 px-3 py-2 rounded-lg transition-all duration-200"
                                  >
                                    <FaArrowDown />
                                    <span>Demote</span>
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : null}
                          {(!file.requesters || file.requesters.length === 0) && (!file.promotedAccess || file.promotedAccess.length === 0) ? (
                            <span className="text-gray-400">No requests or promotions found.</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-gray-500">No files found.</p>
          )}
        </div>
      )}
      {isUpdating && (
        <div className="mt-4 p-4 border rounded-lg bg-gray-100">
          <h3 className="text-lg font-semibold mb-2">Update File {currentFile.ID}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Policy Set:</label>
              {updatedData.policySet.map((policy, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <Select
                    isMulti
                    value={(policy.interest || []).map((value) =>
                      interestsOptions.find((option) => option.value === value)
                    )}
                    onChange={(selectedOptions) => {
                      const newPolicySet = [...updatedData.policySet];
                      newPolicySet[index].interest = selectedOptions.map((option) => option.value);
                      setUpdatedData({ ...updatedData, policySet: newPolicySet });
                    }}
                    options={interestsOptions}
                    className="w-full"
                  />
                  <Select
                    isMulti
                    value={(policy.languages || []).map((value) =>
                      languagesOptions.find((option) => option.value === value)
                    )}
                    onChange={(selectedOptions) => {
                      const newPolicySet = [...updatedData.policySet];
                      newPolicySet[index].languages = selectedOptions.map((option) => option.value);
                      setUpdatedData({ ...updatedData, policySet: newPolicySet });
                    }}
                    options={languagesOptions}
                    className="w-full"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Promote Attributes:</label>
              {updatedData.promoteAttributes.map((attr, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <Select
                    isMulti
                    value={(attr.interest || []).map((value) =>
                      interestsOptions.find((option) => option.value === value)
                    )}
                    onChange={(selectedOptions) => {
                      const newPromoteAttributes = [...updatedData.promoteAttributes];
                      newPromoteAttributes[index].interest = selectedOptions.map((option) => option.value);
                      setUpdatedData({ ...updatedData, promoteAttributes: newPromoteAttributes });
                    }}
                    options={interestsOptions}
                    className="w-full"
                  />
                  <Select
                    isMulti
                    value={(attr.languages || []).map((value) =>
                      languagesOptions.find((option) => option.value === value)
                    )}
                    onChange={(selectedOptions) => {
                      const newPromoteAttributes = [...updatedData.promoteAttributes];
                      newPromoteAttributes[index].languages = selectedOptions.map((option) => option.value);
                      setUpdatedData({ ...updatedData, promoteAttributes: newPromoteAttributes });
                    }}
                    options={languagesOptions}
                    className="w-full"
                  />
                </div>
              ))}
              <button
                onClick={() => setUpdatedData({
                  ...updatedData,
                  promoteAttributes: [...updatedData.promoteAttributes, { interest: [], languages: [] }]
                })}
                className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Add Promote Attribute
              </button>
            </div>
            <button onClick={() => handleSubmitUpdate(currentFile.ID)} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Submit Update</button>
            <button onClick={handleCancelUpdate} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 ml-2">Cancel</button>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
};

export default ManageFiles;