import React, { useState, useEffect } from 'react';
import { FaBell, FaTrash, FaInfoCircle, FaClipboard, FaFileUpload } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import Modal from './Modal';
import { format } from 'date-fns';

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [copiedPublicKey, setCopiedPublicKey] = useState(false);
  const [copiedAssetId, setCopiedAssetId] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('http://localhost:4000/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedNotifications = response.data.sort((a, b) => new Date(b.time) - new Date(a.time));
      setNotifications(sortedNotifications);
    } catch (error) {
      toast.error("Error fetching notifications");
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:4000/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.filter((notif) => notif._id !== notificationId));
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const openModal = (notification) => {
    setSelectedNotification(notification);
    setIsDropdownOpen(false);
    setCopiedPublicKey(false);
    setCopiedAssetId(false);
  };

  const closeModal = () => {
    setSelectedNotification(null);
    setCopiedPublicKey(false);
    setCopiedAssetId(false);
  };

  const copyToClipboard = (text, type) => {
    if (!text) return;
    const formattedText = `${text.replace(/\n/g, '\\n')}\n`;
    navigator.clipboard.writeText(formattedText);

    if (type === 'publicKey') {
      setCopiedPublicKey(true);
      setCopiedAssetId(false);
    } else if (type === 'assetId') {
      setCopiedAssetId(true);
      setCopiedPublicKey(false);
    }
  };

  return (
    <div className="relative">
      <ToastContainer />
      <button className="flex items-center" onClick={toggleDropdown}>
        <FaBell className="text-black text-2xl" />
        {notifications.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full px-1">
            {notifications.length}
          </span>
        )}
      </button>

      {isDropdownOpen && notifications.length > 0 && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-900 text-white rounded-lg shadow-lg z-10 p-2">
         {notifications.map((notification) => (
  <div
    key={notification._id}
    className="flex flex-col p-3 bg-gray-800 hover:bg-gray-700 rounded-lg my-1"
  >
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-2">
        {/* Badge for notification type */}
        <span
          className={`px-1 py-1 rounded text-sm font-semibold ${
            notification.type === 'update'
              ? 'bg-blue-500 text-white'
              : notification.type === 'warning'
              ? 'bg-yellow-500 text-black'
              : 'bg-green-500 text-white'
          }`}
        >
          {notification.type.toUpperCase()}
        </span>

        {/* Badge for assetType */}
        <span
          className={`px-1 py-1 rounded text-sm font-semibold ${
            notification.assetType === 'full'
              ? 'bg-green-500 text-white'
              : 'bg-gray-500 text-white'
          }`}
        >
          {notification.assetType.toUpperCase()}
        </span>
      </div>
    </div>

    {/* Notification message below badges */}
    <div className="mt-2 text-md font-semibold text-white">
      {notification.message}
    </div>

    <div className="flex justify-between items-center mt-2">
      <div className="flex items-center text-gray-400">
        <FaFileUpload className="mr-2" />
        <span className="text-sm">
          {format(new Date(notification.time), 'MMMM do, yyyy - h:mm a')}
        </span>
      </div>
      <div className="flex items-center space-x-2">
        <button onClick={() => openModal(notification)}>
          <FaInfoCircle className="text-blue-400 hover:text-blue-500 mt-8" />
        </button>
        <button onClick={() => deleteNotification(notification._id)}>
          <FaTrash className="text-red-400 hover:text-red-500 mt-8" />
        </button>
      </div>
    </div>
  </div>
))}


        </div>
      )}

      {selectedNotification && (
        <Modal onClose={closeModal}>
          <h2 className="text-lg font-bold mb-4 text-center text-white">Notification Details</h2>
          <p className="text-gray-300"><strong>Message:</strong> {selectedNotification.message}</p>
          <p className="text-gray-300 flex items-center">
            <strong>Type:</strong> 
            <span
              className={`ml-2 px-2 py-1 rounded text-sm font-semibold ${
                selectedNotification.type === 'info'
                  ? 'bg-blue-500 text-white'
                  : selectedNotification.type === 'warning'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-green-500 text-white'
              }`}
            >
              {selectedNotification.type.toUpperCase()}
            </span>
          </p>
          <p className="text-gray-300"><strong>Uploader Name:</strong> {selectedNotification.uploaderName}</p>
          <p className="flex items-center">
  <strong className="text-gray-300 mr-2">AssetType:</strong>
  <span
    className={`px-2 py-1 rounded text-sm font-semibold ${
      selectedNotification.assetType === 'full'
        ? 'bg-green-500 text-white'
        : 'bg-gray-500 text-white'
    }`}
  >
    {selectedNotification.assetType.toUpperCase()}
  </span>
</p>

          <div className="flex items-center space-x-2 mt-2">
            <p className="text-gray-300"><strong>Public Key:</strong></p>
            <button
              onClick={() => copyToClipboard(selectedNotification.publicKey, 'publicKey')}
              className={`${
                copiedPublicKey ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
              } text-white font-semibold px-2 py-1 rounded`}
            >
              <FaClipboard />
            </button>
            {copiedPublicKey && <span className="text-green-500">Copied!</span>}
          </div>

          <div className="flex items-center space-x-2 mt-2">
            <p className="text-gray-300"><strong>Asset Id: {selectedNotification.assetId}</strong></p>
            <button
              onClick={() => copyToClipboard(selectedNotification.assetId, 'assetId')}
              className={`${
                copiedAssetId ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'
              } text-white font-semibold px-2 py-1 rounded`}
            >
              <FaClipboard />
            </button>
            {copiedAssetId && <span className="text-green-500">Copied!</span>}
          </div>

          <button
            onClick={closeModal}
            className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded"
          >
            Close
          </button>
        </Modal>
      )}
    </div>
  );
};

export default Notification;
