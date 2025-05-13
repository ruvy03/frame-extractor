import { ArrowLeft, ArrowRight, Image, Loader, Video } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";

// Main App component
export default function FrameExtractor() {
  const [video, setVideo] = useState(null);
  const [frames, setFrames] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [framesPerPage] = useState(12);
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

  // Pagination logic
  const totalPages = Math.ceil(frames.length / framesPerPage);
  const indexOfLastFrame = currentPage * framesPerPage;
  const indexOfFirstFrame = indexOfLastFrame - framesPerPage;
  const currentFrames = frames.slice(indexOfFirstFrame, indexOfLastFrame);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="min-h-screen bg-purple-900 text-white p-6 flex flex-col">
      <h1 className="text-3xl font-bold text-center mb-8 text-pink-400">
        Frame Extractor
      </h1>

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 mb-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          isDragActive
            ? "border-pink-400 bg-purple-800"
            : "border-pink-300 hover:border-pink-400 hover:bg-purple-800"
        }`}
      >
        <input {...getInputProps()} />
        <Video className="w-16 h-16 text-pink-400 mb-4" />
        <p className="text-lg mb-2 text-center">
          {isDragActive
            ? "Drop your video here..."
            : "Drag & drop your video or GIF here, or click to select"}
        </p>
        <p className="text-sm text-purple-300">
          Supported formats: MP4, WebM, MOV, GIF and more
        </p>
      </div>

      {/* Progress bar */}
      {isExtracting && (
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            <span>Extracting frames...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-purple-700 rounded-full h-4">
            <div
              className="bg-pink-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Frames display */}
      {frames.length > 0 && (
        <>
          <div className="my-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-pink-400">
              Extracted Frames ({frames.length})
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-full ${
                  currentPage === 1
                    ? "text-purple-500"
                    : "text-pink-400 hover:bg-purple-800"
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
                    ? "text-purple-500"
                    : "text-pink-400 hover:bg-purple-800"
                }`}
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>

          {isExtracting && frames.length > 0 && (
            <div className="flex items-center justify-center text-pink-400 mb-4">
              <Loader className="animate-spin mr-2" size={20} />
              <span>Still extracting frames, showing progress...</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentFrames.map((frame, index) => (
              <div
                key={`${indexOfFirstFrame + index}-${frame.slice(0, 20)}`}
                className="bg-purple-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-pink-400 transition-all duration-300"
              >
                <div className="relative aspect-video">
                  <img
                    src={frame}
                    alt={`Frame ${indexOfFirstFrame + index + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-2 text-center text-sm">
                  Frame #{indexOfFirstFrame + index + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom pagination for convenience */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6 space-x-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-md flex items-center ${
                  currentPage === 1
                    ? "bg-purple-700 text-purple-500"
                    : "bg-purple-700 text-white hover:bg-purple-600"
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
                    ? "bg-purple-700 text-purple-500"
                    : "bg-purple-700 text-white hover:bg-purple-600"
                }`}
              >
                Next
                <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!video && !isExtracting && frames.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center p-8 text-purple-300">
          <Image className="w-16 h-16 mb-4 text-pink-400 opacity-50" />
          <h3 className="text-xl font-medium mb-2">No frames extracted yet</h3>
          <p>Upload a video or GIF to extract frames</p>
        </div>
      )}
    </div>
  );
}
