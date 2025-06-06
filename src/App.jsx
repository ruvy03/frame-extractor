import JSZip from "jszip";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Eye,
  EyeOff,
  Image,
  Loader,
  Settings,
  Video,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import FramePopup from "./components/FramePopup";

export default function FrameExtractor() {
  const [video, setVideo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [frames, setFrames] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [framesPerPage, setFramesPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFrame, setSelectedFrame] = useState(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(true);
  const [selectedFrames, setSelectedFrames] = useState(new Set());
  const [maxFrames, setMaxFrames] = useState(240);
  const [frameQuality, setFrameQuality] = useState(0.8);
  const [extractionFormat, setExtractionFormat] = useState("jpeg");
  const [showSettings, setShowSettings] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  // Handle file drop
  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && (file.type.includes("video") || file.type.includes("gif"))) {
      setVideo(URL.createObjectURL(file));
      setVideoFile(file);
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
        const frameInterval = Math.max(0.1, duration / maxFrames);
        let currentTime = 0;
        const tempFrames = [];

        const extractFrame = () => {
          if (currentTime <= duration) {
            videoElement.currentTime = currentTime;

            videoElement.onseeked = () => {
              canvas.width = videoElement.videoWidth;
              canvas.height = videoElement.videoHeight;
              ctx.drawImage(videoElement, 0, 0);

              const mimeType =
                extractionFormat === "png" ? "image/png" : "image/jpeg";
              const frameDataUrl = canvas.toDataURL(mimeType, frameQuality);
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
  }, [video, maxFrames, frameQuality, extractionFormat]);

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

  // Select all frames
  const selectAllFrames = () => {
    const allFrames = new Set();
    for (let i = 0; i < frames.length; i++) {
      allFrames.add(i);
    }
    setSelectedFrames(allFrames);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFrames(new Set());
  };

  // Download selected frames
  const downloadSelectedFrames = async () => {
    if (selectedFrames.size === 1) {
      // If only one frame is selected, download it directly
      const frameIndex = Array.from(selectedFrames)[0];
      const link = document.createElement("a");
      link.href = frames[frameIndex];
      const extension = extractionFormat === "png" ? "png" : "jpg";
      link.download = `frame-${frameIndex + 1}.${extension}`;
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
      const extension = extractionFormat === "png" ? "png" : "jpg";
      Array.from(selectedFrames).forEach((frameIndex) => {
        const frameBlob = dataURLtoBlob(frames[frameIndex]);
        zip.file(`frame-${frameIndex + 1}.${extension}`, frameBlob);
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

  // Reset everything
  const resetExtractor = () => {
    setVideo(null);
    setVideoFile(null);
    setFrames([]);
    setProgress(0);
    setCurrentPage(1);
    setSelectedFrames(new Set());
    setIsExtracting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black to-purple-950 text-white p-6 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-purple-400">Frame Extractor</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <Settings size={16} />
            Settings
          </button>
          {video && (
            <button
              onClick={resetExtractor}
              className="flex items-center gap-2 bg-red-800 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <X size={16} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Drop zone */}
      {!video && (
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
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-900 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-purple-400">
              Extraction Settings
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Max Frames */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-300">
                Max Frames to Extract
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={maxFrames}
                  onChange={(e) => setMaxFrames(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isExtracting}
                />
              </div>
              <p className="text-xs text-gray-400">
                Higher values = more frames but slower extraction
              </p>
            </div>

            {/* Frame Quality */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-300">
                Frame Quality ({Math.round(frameQuality * 100)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={frameQuality}
                onChange={(e) => setFrameQuality(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                disabled={isExtracting}
              />
              <p className="text-xs text-gray-400">
                Higher quality = larger file sizes
              </p>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-purple-300">
                Output Format
              </label>
              <select
                value={extractionFormat}
                onChange={(e) => setExtractionFormat(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors disabled:opacity-50"
                disabled={isExtracting}
              >
                <option value="jpeg">JPEG (smaller size)</option>
                <option value="png">PNG (higher quality)</option>
              </select>
              <p className="text-xs text-gray-400">
                JPEG is recommended for most use cases
              </p>
            </div>
          </div>

          {videoFile && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg text-sm">
              <p className="text-gray-300">
                <strong>File:</strong> {videoFile.name} (
                {(videoFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Video Player */}
      {video && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-purple-400">
              Video Preview
            </h2>
            <button
              onClick={() => setShowVideoPlayer(!showVideoPlayer)}
              className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {showVideoPlayer ? (
                <>
                  <EyeOff size={16} />
                  <span>Hide Video</span>
                </>
              ) : (
                <>
                  <Eye size={16} />
                  <span>Show Video</span>
                </>
              )}
            </button>
          </div>

          {showVideoPlayer && (
            <div className="w-full max-w-4xl mx-auto rounded-lg overflow-hidden bg-black shadow-lg">
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
            <span className="text-purple-300">Extracting frames...</span>
            <span className="text-purple-300">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-3 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Frames display */}
      {frames.length > 0 && (
        <>
          <div className="my-6 flex flex-wrap justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-purple-400 mb-2">
                Extracted Frames ({frames.length})
              </h2>
              <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">
                    Ctrl
                  </kbd>
                  <span>+ Click to select multiple</span>
                </div>
                {selectedFrames.size > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllFrames}
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      className="text-purple-400 hover:text-purple-300 underline"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Pagination settings */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300">Per page:</label>
                <select
                  value={framesPerPage}
                  onChange={(e) => {
                    setFramesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1 text-sm text-white focus:border-purple-500"
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
                    className={`p-2 rounded-lg transition-colors ${
                      currentPage === 1
                        ? "text-gray-600 cursor-not-allowed"
                        : "text-purple-400 hover:bg-gray-800"
                    }`}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <span className="text-sm text-gray-300 min-w-0">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={nextPage}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className={`p-2 rounded-lg transition-colors ${
                      currentPage === totalPages || totalPages === 0
                        ? "text-gray-600 cursor-not-allowed"
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
            <div className="flex items-center justify-center text-purple-400 mb-6 p-4 bg-gray-900 rounded-lg">
              <Loader className="animate-spin mr-2" size={20} />
              <span>Still extracting frames, showing progress...</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {displayedFrames.map((frame, displayIndex) => {
              const actualIndex =
                framesPerPage === 0
                  ? displayIndex
                  : (currentPage - 1) * framesPerPage + displayIndex;

              return (
                <div
                  key={`${actualIndex}-${frame.slice(0, 20)}`}
                  className={`bg-gray-900 rounded-lg overflow-hidden transition-all duration-200 cursor-pointer hover:scale-105 ${
                    selectedFrames.has(actualIndex)
                      ? "ring-2 ring-purple-500 shadow-lg shadow-purple-500/20"
                      : "hover:ring-1 hover:ring-purple-400"
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
                      loading="lazy"
                    />
                    {selectedFrames.has(actualIndex) && (
                      <div className="absolute top-2 right-2 bg-purple-600 rounded-full p-1">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-2 text-center text-xs text-gray-400">
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
            <div className="flex justify-center mt-8 space-x-3">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`px-6 py-3 rounded-lg flex items-center transition-colors ${
                  currentPage === 1
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                    : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                <ArrowLeft size={16} className="mr-2" />
                Previous
              </button>
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`px-6 py-3 rounded-lg flex items-center transition-colors ${
                  currentPage === totalPages
                    ? "bg-gray-800 text-gray-500 cursor-not-allowed"
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
            className="flex items-center gap-3 bg-gradient-to-r from-purple-700 to-pink-700 hover:from-purple-600 hover:to-pink-600 text-white py-4 px-6 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <Download size={20} />
            <span className="font-medium">
              Download {selectedFrames.size} Frame
              {selectedFrames.size > 1 ? "s" : ""}
            </span>
          </button>
        </div>
      )}

      {/* Empty state */}
      {!video && !isExtracting && frames.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center p-12 text-gray-400">
          <Image className="w-20 h-20 mb-6 text-purple-500 opacity-50" />
          <h3 className="text-2xl font-medium mb-3 text-gray-300">
            No frames extracted yet
          </h3>
          <p className="text-lg">Upload a video or GIF to extract frames</p>
        </div>
      )}
    </div>
  );
}
