// // DoPannelOptions/InfoPanel.js
// import React, { useEffect, useState } from "react";
// import { Doughnut, Line, Bar, Pie } from "react-chartjs-2";
// import axios from "axios";
// import { Chart as ChartJS, ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from "chart.js";
// import { ToastContainer, toast } from "react-toastify"; // Importing ToastContainer and toast
// import "react-toastify/dist/ReactToastify.css"; // Importing CSS for Toast notifications

// import { BarElement } from "chart.js";

// ChartJS.register(ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, BarElement);




// const InfoPanel = () => {
//   const [fileCount, setFileCount] = useState(0);
//   const [requestCount, setRequestCount] = useState(0);
//   const [filesData, setFilesData] = useState([]);
//   const [revokedData, setRevokedData] = useState([]);

//   useEffect(() => {
//     const fetchFileCounts = async () => {
//       const token = localStorage.getItem('token');

//       try {
//         const uploadedResponse = await axios.get("http://localhost:4000/assets", {
//           headers: {
//             "Authorization": `Bearer ${token}`
//           },
//         });

//         if (uploadedResponse.data && uploadedResponse.data.success) {
//           console.log(uploadedResponse.data);

//           const allRequesters = uploadedResponse.data.files.reduce((acc, file) => {
//             return acc.concat(file.requesters);
//           }, []);

//           setFileCount(uploadedResponse.data.files.length);
//           setRequestCount(allRequesters.length);
//           setFilesData(uploadedResponse.data.files);

//           const revokedData = uploadedResponse.data.files.map(file => {
//             return file.revokedAccess.length;
//           });

//           setRevokedData(revokedData);
//           console.log(uploadedResponse.data.files);
//         } else {
//           toast.error(uploadedResponse.data.message || "Failed to fetch files");
//         }
//       } catch (error) {
//         toast.error(error.response ? error.response.data.message : error.message);
//       }
//     };

//     fetchFileCounts();
//   }, []);

//   const doughnutData = {
//     labels: ["Files Uploaded", "File Requests"],
//     datasets: [
//       {
//         data: [fileCount, requestCount],
//         backgroundColor: ["#4C82E2", "#FF6384"],
//         hoverBackgroundColor: ["#3C72C1", "#FF5063"],
//       },
//     ],
//   };

//   const barChartData = {
//     labels: filesData.map(file => file.name),
//     datasets: [
//       {
//         label: 'Number of Revoked Accesses',
//         data: revokedData,
//         backgroundColor: "#FF6384",
//         borderColor: "#FF5063",
//         borderWidth: 1,
//       },
//     ],
//   };

//   const lineChartData = {
//     labels: filesData.map(file => file.name),
//     datasets: [
//       {
//         label: 'Download Count Over Time',
//         data: filesData.map(file => file.downloadCount),
//         fill: false,
//         borderColor: '#4C82E2',
//         tension: 0.1,
//       },
//     ],
//   };

//   // Pie chart data: Percentage of revoked vs non-revoked accesses
//   const pieChartData = {
//     labels: ["Revoked Access", "Active Access"],
//     datasets: [
//       {
//         data: [
//           revokedData.reduce((acc, count) => acc + count, 0),
//           requestCount - revokedData.reduce((acc, count) => acc + count, 0),
//         ],
//         backgroundColor: ["#FF6384", "#36A2EB"],
//         hoverBackgroundColor: ["#FF5063", "#3483D1"],
//       },
//     ],
//   };

//   return (
//     <div className="text-center">
//       <ToastContainer />
//       <h2 className="text-xl font-semibold mb-4">File Upload & Request Info</h2>

//       <div className="flex justify-center items-center space-x-10 mb-6">
//         <div>
//           <Doughnut data={doughnutData} />
//           <p className="mt-2 font-semibold">File Status</p>
//         </div>
//       </div>

//       <div className="flex justify-center items-center space-x-10 mb-6">
//         <div className="flex space-x-10">
//           <div>
//             <Bar data={barChartData} options={{
//               responsive: true,
//               scales: {
//                 x: {
//                   title: {
//                     display: true,
//                     text: 'File Names',
//                   },
//                 },
//                 y: {
//                   title: {
//                     display: true,
//                     text: 'Number of Revoked Accesses',
//                   },
//                 },
//               },
//             }} />
//             <p className="mt-2 font-semibold">Revoked Access Comparison</p>
//           </div>

//           <div>
//             <Line data={lineChartData} options={{
//               responsive: true,
//               scales: {
//                 x: {
//                   title: {
//                     display: true,
//                     text: 'File Names',
//                   },
//                 },
//                 y: {
//                   title: {
//                     display: true,
//                     text: 'Download Count',
//                   },
//                 },
//               },
//             }} />
//             <p className="mt-2 font-semibold">Download Count Over Time</p>
//           </div>
//         </div>
//       </div>


//     </div>
//   );
// };

// export default InfoPanel;
// DoPannelOptions/InfoPanel.js

import React, { useEffect, useState } from "react";
import { Doughnut, Line, Bar, Pie } from "react-chartjs-2";
import axios from "axios";
import { Chart as ChartJS, ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, BarElement } from "chart.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

ChartJS.register(ArcElement, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, BarElement);

const InfoPanel = () => {
  const [fileCount, setFileCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [filesData, setFilesData] = useState([]);
  const [revokedData, setRevokedData] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [deleteResults, setDeleteResults] = useState([]);

  useEffect(() => {
    const fetchFileCounts = async () => {
      const token = localStorage.getItem('token');

      try {
        const uploadedResponse = await axios.get("http://localhost:4000/assets", {
          headers: {
            "Authorization": `Bearer ${token}`
          },
        });

        if (uploadedResponse.data && uploadedResponse.data.success) {
          console.log(uploadedResponse.data);

          const allRequesters = uploadedResponse.data.files.reduce((acc, file) => {
            return acc.concat(file.requesters);
          }, []);

          setFileCount(uploadedResponse.data.files.length);
          setRequestCount(allRequesters.length);
          setFilesData(uploadedResponse.data.files);

          const revokedData = uploadedResponse.data.files.map(file => {
            return file.revokedAccess.length;
          });

          setRevokedData(revokedData);
          console.log(uploadedResponse.data.files);
        } else {
          toast.error(uploadedResponse.data.message || "Failed to fetch files");
        }
      } catch (error) {
        toast.error(error.response ? error.response.data.message : error.message);
      }
    };

    fetchFileCounts();
  }, []);

  const handleConcurrentRequests = async (requestCount) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    

    formData.append("file", filesData[0]?.file || new Blob());
    formData.append("metadata", JSON.stringify(filesData[0]?.metadata || []));
    formData.append("policyAttributes", JSON.stringify(filesData[0]?.policyAttributes || [{"level":"Public","expertise":"Medical"}]));

    const requests = Array.from({ length: requestCount }, (_, index) =>
        axios.post("http://localhost:4000/uploadTest", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                "Authorization": `Bearer ${token}`,
            },
        }).catch(err => {
            console.error(`Request ${index + 1} failed:`, err);
            return null; // Ensure all errors are captured without breaking the promise chain
        })
    );

    const start = performance.now();
    try {
        // Await all requests to finish
        const results = await Promise.all(requests);
        const successfulResults = results.filter(result => result != null); // Filter out failed requests
        const duration = performance.now() - start;
        
        console.log(`Time for ${requestCount} requests: ${duration}ms`);
        return duration;
    } catch (error) {
        console.error("Error in concurrent requests:", error);
        return null;
    }
};


  const testConcurrentRequests = async () => {
    const requestCounts = [10 , 20 , 30];
    const results = [];

    for (const count of requestCounts) {
        const timeTaken = await handleConcurrentRequests(count);
        if (timeTaken) {
            results.push({ count, timeTaken });
        }
    }

    setTestResults(results);
  };

  const doughnutData = {
    labels: ["Files Uploaded", "File Requests"],
    datasets: [
      {
        data: [fileCount, requestCount],
        backgroundColor: ["#4C82E2", "#FF6384"],
        hoverBackgroundColor: ["#3C72C1", "#FF5063"],
      },
    ],
  };

  const barChartData = {
    labels: filesData.map(file => file.name),
    datasets: [
      {
        label: 'Number of Revoked Accesses',
        data: revokedData,
        backgroundColor: "#FF6384",
        borderColor: "#FF5063",
        borderWidth: 1,
      },
    ],
  };

  const lineChartData = {
    labels: filesData.map(file => file.name),
    datasets: [
      {
        label: 'Download Count Over Time',
        data: filesData.map(file => file.downloadCount),
        fill: false,
        borderColor: '#4C82E2',
        tension: 0.1,
      },
    ],
  };

  const concurrentTestData = {
    labels: testResults.map(result => `${result.count} requests`),
    datasets: [
      {
        label: 'Time Taken (ms)',
        data: testResults.map(result => result.timeTaken),
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }
    ]
  };
  const handleDeleteRequests = async (filesToDelete) => {
    const token = localStorage.getItem('token');
  
    const requests = filesToDelete.map(file =>
      axios.delete(`http://localhost:4000/delete/assets/${file.ID}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }).catch(err => {
        console.error(`Deletion failed for file ${file.ID}:`, err);
        return null;
      })
    );
  
    const start = performance.now();
    try {
      await Promise.all(requests);
      const duration = performance.now() - start;
      console.log(`Time to delete ${filesToDelete.length} assets: ${duration}ms`);
      return duration;
    } catch (error) {
      console.error("Error during deletion requests:", error);
      return null;
    }
  };
  
  const testDeleteRequests = async () => {
    const batchSize = 10;
    const results = [];
    const totalFiles = filesData.length;
    let cumulativeTime = 0;
  
    for (let i = 0; i < totalFiles; i += batchSize) {
      // Get the next batch of files up to the batchSize (10 in this case)
      const filesToDelete = filesData.slice(i, i + batchSize);
  
      // Delete the batch and add the time taken to cumulativeTime
      const timeTaken = await handleDeleteRequests(filesToDelete);
      if (timeTaken) {
        cumulativeTime += timeTaken;
        
        // Only add result after every 10, 20, 30 deletions, etc.
        results.push({ count: i + batchSize, timeTaken: cumulativeTime });
      }
    }
  
    setDeleteResults(results);
  };



  const deleteTestData = {
    labels: deleteResults.map(result => `${result.count} deletions`),
    datasets: [
      {
        label: 'Time Taken (ms)',
        data: deleteResults.map(result => result.timeTaken),
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1
      }
    ]
  };

  return (
    <div className="text-center">
      <ToastContainer />
      <h2 className="text-xl font-semibold mb-4">File Upload & Request Info</h2>

      <div className="flex justify-center items-center space-x-10 mb-6">
        <div>
          <Doughnut data={doughnutData} />
          <p className="mt-2 font-semibold">File Status</p>
        </div>
      </div>

      {/* Charts and buttons for concurrent and deletion tests */}
      <button onClick={testConcurrentRequests} className="mt-4 p-2 bg-blue-500 text-white rounded">
        Create Asset Test
      </button>
      <button onClick={testDeleteRequests} className="mt-4 p-2 bg-red-500 text-white rounded">
        Delete Asset Test
      </button>

      {testResults.length > 0 && (
        <div className="mt-6">
          <Bar data={concurrentTestData} options={{ responsive: true, scales: { x: { title: { display: true, text: 'Concurrent Requests' } }, y: { title: { display: true, text: 'Time Taken (ms)' } } } }} />
          <p className="mt-2 font-semibold">Create Assets Timing</p>
        </div>
      )}

      {deleteResults.length > 0 && (
        <div className="mt-6">
          <Bar data={deleteTestData} options={{ responsive: true, scales: { x: { title: { display: true, text: 'Deletion Requests' } }, y: { title: { display: true, text: 'Time Taken (ms)' } } } }} />
          <p className="mt-2 font-semibold">Delete Assets Timing</p>
        </div>
      )}
    </div>
  );
};

export default InfoPanel;
