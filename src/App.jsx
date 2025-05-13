import JSZip from "jszip";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Eye,
  EyeOff,
  Image,
  Loader,
  Video,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import FramePopup from "./components/FramePopup";

export default function FrameExtractor() {
  const [video, setVideo] = useState(null);
  const [frames, setFrames] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [framesPerPage, setFramesPerPage] = useState(0); // 0 means all frames
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(true);
  const [selectedFrames, setSelectedFrames] = useState(new Set());
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  // Handle file drop
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && (file.type.includes("video") || file.type.includes("gif"))) {
      setVideo(URL.createObjectURL(file));
      setFrames([]);
      setProgress(0);
      setCurrentPage(1);
      setSelectedFrames(new Set());
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [],
      "image/gif": [],
    },
    multiple: false,
  });

  // Extract frames from video
  useEffect(() => {
    if (!video) return;

    const extractFrames = async () => {
      const videoElement = document.createElement("video");
      videoElement.src = video;
      videoRef.current = videoElement;

      videoElement.onloadedmetadata = () => {
        setIsExtracting(true);
        const duration = videoElement.duration;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        // Set frame extraction interval based on video length
        const frameInterval = Math.max(0.1, duration / 240); // Max 240 frames
        let currentTime = 0;
        const tempFrames = [];

        const extractFrame = () => {
          if (currentTime <= duration) {
            videoElement.currentTime = currentTime;

            videoElement.onseeked = () => {
              canvas.width = videoElement.videoWidth;
              canvas.height = videoElement.videoHeight;
              ctx.drawImage(videoElement, 0, 0);

              const frameDataUrl = canvas.toDataURL("image/jpeg");
              tempFrames.push(frameDataUrl);

              // Update progress
              const progressValue = (currentTime / duration) * 100;
              setProgress(progressValue);

              // Update frames periodically to show progress
              if (tempFrames.length % 5 === 0 || progressValue >= 99) {
                setFrames([...tempFrames]);
              }

              currentTime += frameInterval;
              if (currentTime <= duration) {
                extractFrame();
              } else {
                setIsExtracting(false);
                setProgress(100);
                setFrames([...tempFrames]);
              }
            };
          }
        };

        extractFrame();
      };
    };

    extractFrames();

    return () => {
      if (videoRef.current) {
        videoRef.current.src = "";
      }
    };
  }, [video]);

  // Handle frame pagination
  const displayedFrames = React.useMemo(() => {
    if (framesPerPage === 0) return frames; // Show all frames

    const indexOfLastFrame = currentPage * framesPerPage;
    const indexOfFirstFrame = indexOfLastFrame - framesPerPage;
    return frames.slice(indexOfFirstFrame, indexOfLastFrame);
  }, [frames, framesPerPage, currentPage]);

  const totalPages = React.useMemo(() => {
    if (framesPerPage === 0) return 1;
    return Math.ceil(frames.length / framesPerPage);
  }, [frames.length, framesPerPage]);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Handle frame selection
  const toggleFrameSelection = (index, ctrlKey) => {
    const newSelectedFrames = new Set(selectedFrames);

    if (ctrlKey) {
      if (newSelectedFrames.has(index)) {
        newSelectedFrames.delete(index);
      } else {
        newSelectedFrames.add(index);
      }
    } else {
      // Select only this frame if Ctrl is not pressed
      newSelectedFrames.clear();
      newSelectedFrames.add(index);
    }

    setSelectedFrames(newSelectedFrames);
  };

  // Download selected frames
  const downloadSelectedFrames = async () => {
    if (selectedFrames.size === 1) {
      // If only one frame is selected, download it directly
      const frameIndex = Array.from(selectedFrames)[0];
      const link = document.createElement("a");
      link.href = frames[frameIndex];
      link.download = `frame-${frameIndex + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // If multiple frames are selected, create a zip file
      const zip = new JSZip();

      // Function to convert data URL to blob
      const dataURLtoBlob = (dataURL) => {
        const arr = dataURL.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
      };

      // Add all selected frames to the zip
      Array.from(selectedFrames).forEach((frameIndex) => {
        const frameBlob = dataURLtoBlob(frames[frameIndex]);
        zip.file(`frame-${frameIndex + 1}.jpg`, frameBlob);
      });

      // Generate and download the zip
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(content);
      link.download = `frames-${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-purple-950 text-white p-6 flex flex-col">
      <h1 className="text-3xl font-bold text-center mb-8 text-purple-400">
        Frame Extractor
      </h1>

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 mb-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 max-w-2xl mx-auto w-full ${
          isDragActive
            ? "border-purple-600 bg-gray-900"
            : "border-purple-500 hover:border-purple-600 hover:bg-gray-900"
        }`}
      >
        <input {...getInputProps()} />
        <Video className="w-16 h-16 text-purple-500 mb-4" />
        <p className="text-lg mb-2 text-center">
          {isDragActive
            ? "Drop your video here..."
            : "Drag & drop your video or GIF here, or click to select"}
        </p>
        <p className="text-sm text-gray-400">
          Supported formats: MP4, WebM, MOV, GIF and more
        </p>
      </div>

      {/* Video Player */}
      {video && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold text-purple-400">
              Video Preview
            </h2>
            <button
              onClick={() => setShowVideoPlayer(!showVideoPlayer)}
              className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 text-white py-1 px-3 rounded-md transition-colors"
            >
              {showVideoPlayer ? (
                <>
                  <EyeOff size={16} className="mr-2" />
                  <span>Hide Video</span>
                </>
              ) : (
                <>
                  <Eye size={16} className="mr-2" />
                  <span>Show Video</span>
                </>
              )}
            </button>
          </div>

          {showVideoPlayer && (
            <div className="w-full max-w-4xl mx-auto rounded-lg overflow-hidden bg-black">
              <video
                src={video}
                className="w-full max-h-96 mx-auto"
                controls
                preload="auto"
              />
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {isExtracting && (
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span>Extracting frames...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4">
            <div
              className="bg-purple-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Frames display */}
      {frames.length > 0 && (
        <>
          <div className="my-4 flex flex-wrap justify-between items-center gap-2">
            <div>
              <h2 className="text-xl font-semibold text-purple-400">
                Extracted Frames ({frames.length})
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">
                  Ctrl
                </kbd>{" "}
                + Click to select multiple frames
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Pagination settings */}
              <div className="flex items-center">
                <label className="mr-2 text-sm">Frames per page:</label>
                <select
                  value={framesPerPage}
                  onChange={(e) => {
                    setFramesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                >
                  <option value="0">All</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {/* Pagination controls */}
              {framesPerPage > 0 && totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`p-2 rounded-full ${
                      currentPage === 1
                        ? "text-gray-600"
                        : "text-purple-400 hover:bg-gray-800"
                    }`}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <span>
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`p-2 rounded-full ${
                      currentPage === totalPages || totalPages === 0
                        ? "text-gray-600"
                        : "text-purple-400 hover:bg-gray-800"
                    }`}
                  >
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {isExtracting && frames.length > 0 && (
            <div className="flex items-center justify-center text-purple-400 mb-4">
              <Loader className="animate-spin mr-2" size={20} />
              <span>Still extracting frames, showing progress...</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {displayedFrames.map((frame, displayIndex) => {
              const actualIndex =
                framesPerPage === 0
                  ? displayIndex
                  : (currentPage - 1) * framesPerPage + displayIndex;

              return (
                <div
                  key={`${actualIndex}-${frame.slice(0, 20)}`}
                  className={`bg-gray-900 rounded-lg overflow-hidden transition-all duration-300 cursor-pointer ${
                    selectedFrames.has(actualIndex)
                      ? "ring-2 ring-purple-500"
                      : "hover:ring-1 hover:ring-purple-500"
                  }`}
                  onClick={(e) => {
                    toggleFrameSelection(actualIndex, e.ctrlKey);
                    if (!e.ctrlKey) {
                      setSelectedFrame({ frame, index: actualIndex });
                    }
                  }}
                >
                  <div className="aspect-video relative">
                    <img
                      src={frame}
                      alt={`Frame ${actualIndex + 1}`}
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                  <div className="p-1 text-center text-xs">
                    #{actualIndex + 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected frame popup */}
          {selectedFrame && (
            <FramePopup
              frame={selectedFrame.frame}
              index={selectedFrame.index}
              frames={frames}
              onClose={() => setSelectedFrame(null)}
              onNavigate={(newIndex) => {
                if (newIndex >= 0 && newIndex < frames.length) {
                  setSelectedFrame({
                    frame: frames[newIndex],
                    index: newIndex,
                  });
                }
              }}
            />
          )}

          {/* Bottom pagination for convenience */}
          {framesPerPage > 0 && totalPages > 1 && (
            <div className="flex justify-center mt-6 space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-md flex items-center ${
                  currentPage === 1
                    ? "bg-gray-800 text-gray-500"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                <ArrowLeft size={16} className="mr-2" />
                Previous
              </button>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-md flex items-center ${
                  currentPage === totalPages
                    ? "bg-gray-800 text-gray-500"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                Next
                <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Selected frames floating action button */}
      {selectedFrames.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={downloadSelectedFrames}
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white py-3 px-4 rounded-full shadow-lg transition-colors"
          >
            <Download size={20} />
            <span>Download {selectedFrames.size} Selected</span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {!video && !isExtracting && frames.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center p-8 text-gray-400">
          <Image className="w-16 h-16 mb-4 text-purple-500 opacity-50" />
          <h3 className="text-xl font-medium mb-2">No frames extracted yet</h3>
          <p>Upload a video or GIF to extract frames</p>
        </div>
      )}
    </div>
  );
}
