import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chrono } from 'react-chrono';

const Version = () => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [timelineIndex, setTimelineIndex] = useState(0);
  const [jumpIndex, setJumpIndex] = useState(''); 

  const chronoRef = useRef(null); 

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:4000/assets', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        setVersions(response.data.files);
        setLoading(false);
      } catch (error) {
        setError('Error fetching assets');
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  if (loading) {
    return <div className="text-center text-lg text-gray-600">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-lg text-red-600">{error}</div>;
  }

  const groupedVersions = versions.reduce((acc, version) => {
    if (!acc[version.name]) {
      acc[version.name] = [];
    }
    acc[version.name].push(version);
    return acc;
  }, {});

  for (const fileName in groupedVersions) {
    groupedVersions[fileName].sort((a, b) => new Date(a.ReleasedAt) - new Date(b.ReleasedAt));
  }

  const handleFileSelect = (fileName) => {
    setSelectedFile(fileName);
    setTimelineIndex(0);
  };

  const timelineData = groupedVersions[selectedFile]?.map((version, index) => ({
    title: `Version ${index + 1}`,
    cardTitle: version.name,
    cardSubtitle: new Date(version.ReleasedAt).toLocaleString(),

    cardDetailedText: (
      <div>
        <div><strong>Downloads:</strong> {version.downloadCount}</div>
        <div>
        <strong>Asset Policy:</strong>
        <div>
            {Array.isArray(version.policySet) && version.policySet.length > 0
                ? version.policySet.map((policy, idx) => (
                    <div key={idx}>
                    {typeof policy === 'object' ? (
                        <div>
                        <div><strong>Interest:</strong> {policy.interest.join(', ')}</div>
                        <div><strong>Languages:</strong> {policy.languages.join(', ')}</div>
                        </div>
                    ) : (
                        <div>{policy}</div>
                    )}
                    </div>
                ))
                : version.policySet && version.policySet !== 'No policies available'
                ? version.policySet.split(',').map((policy, idx) => <div key={idx}>{policy.trim()}</div>)
                : <div>No policies available</div>}
        </div>
        </div>
        <div>
          <strong>Meta Data:</strong>
          <div>
            {Array.isArray(version.MetaData) && version.MetaData.length > 0
              ? version.MetaData.map((meta, idx) => <div key={idx}>{meta}</div>)
              : version.MetaData && version.MetaData !== 'No MetaData available' ? version.MetaData.split(',').map((meta, idx) => <div key={idx}>{meta.trim()}</div>) : <div>No MetaData available</div>}
          </div>
        </div>
      </div>
    ),
  }));
  
  

  const handleNext = () => {
    if (timelineIndex < timelineData.length - 1) {
      setTimelineIndex(timelineIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (timelineIndex > 0) {
      setTimelineIndex(timelineIndex - 1);
    }
  };

  const handleJumpTo = () => {
    const index = parseInt(jumpIndex);
    if (index >= 0 && index < timelineData.length) {
      chronoRef.current.jumpTo(index); 

      setTimeout(() => {
        if (chronoRef.current) {
          chronoRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300); 
    } else {
      alert('Invalid index');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 min-h-screen">

        <div className="w-full mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Available Files</h3>
        <div className="flex flex-wrap gap-4 overflow-auto max-w-full p-2 bg-white shadow-md rounded-md">
            {Object.keys(groupedVersions).map((fileName) => (
            <button
                key={fileName}
                className="text-sm md:text-base font-medium text-gray-700 bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-md shadow-sm transition-all duration-200 transform hover:scale-105 focus:outline-none"
                onClick={() => handleFileSelect(fileName)}
            >
                {fileName}
            </button>
            ))}
        </div>
        </div>


      {selectedFile && timelineData && (
        <div className="w-full">
          <h3 className="text-2xl font-semibold text-gray-800 mb-6">{selectedFile}</h3>

          <Chrono
            items={timelineData}
            mode="VERTICAL"  // تغییر به حالت عمودی
            theme={{
              primary: 'blue',
              secondary: 'purple',
              cardBgColor: 'white',
              cardForeColor: 'black',
            }}
            hideControls={false} 
            scrollable={true} 
            ref={chronoRef}
            key={selectedFile}  
          />
        </div>
      )}
    </div>
  );
};

export default Version;
