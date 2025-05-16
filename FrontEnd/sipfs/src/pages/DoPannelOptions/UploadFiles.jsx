import React, { useState } from "react";
import axios from "axios";
import Select from "react-select";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UploadFiles = () => {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState("");
  const [tags, setTags] = useState([]);
  const [policyAttributes, setPolicyAttributes] = useState([
    { languages: [], interest: [] },
  ]);
  const [promoteAttributes, setPromoteAttributes] = useState([
    { languages: [], interest: [] },
  ]); // اضافه شدن promoteAttributes
  const [version, setVersion] = useState("demo"); // نسخه ثابت به DEMO

  // گزینه‌های انتخاب برای interests و languages
  const languagesOptions = [
    { value: "Java", label: "Java" },
    { value: "Python", label: "Python" },
    { value: "JavaScript", label: "JavaScript" },
    { value: "C++", label: "C++" },
    { value: "Ruby", label: "Ruby" },
  ];

  const interestsOptions = [
    { value: "Web Design", label: "Web Design" },
    { value: "Windows Development", label: "Windows Development" },
    { value: "Mobile Apps", label: "Mobile Apps" },
    { value: "AI and Machine Learning", label: "AI and Machine Learning" },
    { value: "Cybersecurity", label: "Cybersecurity" },
  ];

  // مدیریت تغییرات فایل
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // مدیریت تغییرات متادیتا و تگ‌ها
  const handleMetadataChange = (e) => {
    setMetadata(e.target.value);
  };

  const handleTagChange = (e) => {
    if (e.key === "Enter" && metadata.trim()) {
      e.preventDefault();
      setTags([...tags, metadata.trim()]);
      setMetadata("");
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  // مدیریت تغییرات policyAttributes
  const handleLanguagesChange = (index, selectedLanguages) => {
    const updatedAttributes = [...policyAttributes];
    updatedAttributes[index].languages = selectedLanguages.map((lang) => lang.value);
    setPolicyAttributes(updatedAttributes);
  };

  const handleInterestChange = (index, selectedInterests) => {
    const updatedAttributes = [...policyAttributes];
    updatedAttributes[index].interest = selectedInterests.map((interest) => interest.value);
    setPolicyAttributes(updatedAttributes);
  };

  // مدیریت تغییرات promoteAttributes
  const handlePromoteLanguagesChange = (index, selectedLanguages) => {
    const updatedAttributes = [...promoteAttributes];
    updatedAttributes[index].languages = selectedLanguages.map((lang) => lang.value);
    setPromoteAttributes(updatedAttributes);
  };

  const handlePromoteInterestChange = (index, selectedInterests) => {
    const updatedAttributes = [...promoteAttributes];
    updatedAttributes[index].interest = selectedInterests.map((interest) => interest.value);
    setPromoteAttributes(updatedAttributes);
  };

  // ارسال فرم
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("metadata", JSON.stringify(tags));
    formData.append("policyAttributes", JSON.stringify(policyAttributes));
    formData.append("promoteAttributes", JSON.stringify(promoteAttributes)); // اضافه شدن promoteAttributes
    formData.append("version", version);

    const token = localStorage.getItem("token");
    const toastId = toast.loading("Creating Asset...");

    try {
      const response = await axios.post("http://localhost:4000/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        toast.update(toastId, {
          render: response.data.message,
          type: "success",
          isLoading: false,
          autoClose: 2000,
        });
        // بازنشانی فرم
        setFile(null);
        setTags([]);
        setPolicyAttributes([{ languages: [], interest: [] }]);
        setPromoteAttributes([{ languages: [], interest: [] }]);
      } else {
        toast.update(toastId, {
          render: response.data.error.message || "An unexpected error occurred",
          type: "error",
          isLoading: false,
          autoClose: 2000,
        });
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message || "An unexpected error occurred.";
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 2000,
      });
    }
  };

  // استایل‌های سفارشی برای react-select
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: "#f9fafb",
      borderRadius: "8px",
      border: "1px solid #ddd",
      padding: "4px",
      minHeight: "38px",
      fontSize: "14px",
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? "#60a5fa" : state.isFocused ? "#e2e8f0" : null,
      color: state.isSelected ? "white" : "black",
      padding: "10px",
      cursor: "pointer",
    }),
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-lg shadow-lg border border-gray-300">
      <h2 className="text-2xl font-bold mb-4 text-center text-blue-600">Upload Files</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* بخش آپلود فایل */}
        <div>
          <label className="block mb-2 text-gray-700 font-semibold">Select File:</label>
          <input
            type="file"
            onChange={handleFileChange}
            required
            className="border rounded p-2 w-full bg-gray-50 hover:bg-gray-100 transition duration-200"
          />
        </div>

        {/* بخش تگ‌ها */}
        <div>
          <label className="block mb-2 text-gray-700 font-semibold">Tags:</label>
          <div className="flex flex-wrap mb-2">
            {tags.map((tag, index) => (
              <div
                key={index}
                className="flex items-center bg-blue-100 rounded-full px-3 py-1 mr-2 mb-2"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            type="text"
            value={metadata}
            onChange={handleMetadataChange}
            onKeyPress={handleTagChange}
            placeholder="Enter tag and press Enter..."
            className="border rounded p-2 w-full bg-gray-50 hover:bg-gray-100 transition duration-200"
          />
        </div>

        {/* بخش سیاست‌های دسترسی */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Access Policies</h3>
          <div className="mb-4">
            <label className="block mb-2 text-gray-700 font-semibold">Interest:</label>
            <Select
              isMulti
              value={policyAttributes[0].interest.map((value) =>
                interestsOptions.find((option) => option.value === value)
              )}
              onChange={(selectedOptions) => handleInterestChange(0, selectedOptions)}
              options={interestsOptions}
              className="w-full"
              styles={customStyles}
            />
          </div>
          <div>
            <label className="block mb-2 text-gray-700 font-semibold">Languages:</label>
            <Select
              isMulti
              value={policyAttributes[0].languages.map((value) =>
                languagesOptions.find((option) => option.value === value)
              )}
              onChange={(selectedOptions) => handleLanguagesChange(0, selectedOptions)}
              options={languagesOptions}
              className="w-full"
              styles={customStyles}
            />
          </div>
        </div>

        {/* بخش ویژگی‌های ارتقا (Promote Attributes) */}
        <div>
          <h3 className="text-lg font-semibold mb-2">Promote Attributes</h3>
          <div className="mb-4">
            <label className="block mb-2 text-gray-700 font-semibold">Promote Interest:</label>
            <Select
              isMulti
              value={promoteAttributes[0].interest.map((value) =>
                interestsOptions.find((option) => option.value === value)
              )}
              onChange={(selectedOptions) => handlePromoteInterestChange(0, selectedOptions)}
              options={interestsOptions}
              className="w-full"
              styles={customStyles}
            />
          </div>
          <div>
            <label className="block mb-2 text-gray-700 font-semibold">Promote Languages:</label>
            <Select
              isMulti
              value={promoteAttributes[0].languages.map((value) =>
                languagesOptions.find((option) => option.value === value)
              )}
              onChange={(selectedOptions) => handlePromoteLanguagesChange(0, selectedOptions)}
              options={languagesOptions}
              className="w-full"
              styles={customStyles}
            />
          </div>
        </div>

        {/* دکمه ارسال */}
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600 transition duration-200"
        >
          Upload File
        </button>
      </form>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default UploadFiles;