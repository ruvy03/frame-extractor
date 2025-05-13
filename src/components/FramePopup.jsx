import { ArrowLeft, ArrowRight, Download, X } from "lucide-react";
import React, { useEffect, useState } from "react";

const FramePopup = ({ frame, index, frames, onClose, onNavigate }) => {
  const [sliderValue, setSliderValue] = useState(index);

  // Update slider when index changes from outside
  useEffect(() => {
    setSliderValue(index);
  }, [index]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = frame;
    link.download = `frame-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const goToPrevFrame = () => {
    onNavigate(index - 1);
  };

  const goToNextFrame = () => {
    onNavigate(index + 1);
  };

  // Handle slider change
  const handleSliderChange = (e) => {
    const newIndex = parseInt(e.target.value, 10);
    setSliderValue(newIndex);
  };

  // When slider is released, navigate to the frame
  const handleSliderChangeComplete = () => {
    if (sliderValue !== index) {
      onNavigate(sliderValue);
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        if (index > 0) {
          goToPrevFrame();
        }
      } else if (e.key === "ArrowRight") {
        if (index < frames.length - 1) {
          goToNextFrame();
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [index, frames.length]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.85)" }}
    >
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-full overflow-hidden relative">
        <div className="p-4 flex justify-between items-center border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">
            Frame #{index + 1} of {frames.length}
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1 bg-purple-900 hover:bg-purple-800 text-white py-2 px-3 rounded-md transition-colors"
            >
              <Download size={16} />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center bg-black p-4 h-[60vh] overflow-auto relative">
          {/* Navigation buttons on the sides */}
          {index > 0 && (
            <button
              onClick={goToPrevFrame}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 p-3 rounded-full text-white transition-all"
              aria-label="Previous frame"
            >
              <ArrowLeft size={24} />
            </button>
          )}

          <img
            src={frame}
            alt={`Frame ${index + 1}`}
            className="max-h-full max-w-full object-contain"
          />

          {index < frames.length - 1 && (
            <button
              onClick={goToNextFrame}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 p-3 rounded-full text-white transition-all"
              aria-label="Next frame"
            >
              <ArrowRight size={24} />
            </button>
          )}
        </div>
        {/* Timeline slider */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-400">1</span>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={sliderValue}
              onChange={handleSliderChange}
              onMouseUp={handleSliderChangeComplete}
              onTouchEnd={handleSliderChangeComplete}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-sm text-gray-400">{frames.length}</span>
          </div>
          <div className="text-center text-xs text-gray-400 mt-1">
            Frame {sliderValue + 1} / {frames.length}
          </div>
        </div>
        <div className="p-3 border-t border-gray-800 flex justify-between">
          <button
            onClick={goToPrevFrame}
            disabled={index === 0}
            className={`px-4 py-2 rounded-md flex items-center ${
              index === 0
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            <ArrowLeft size={16} className="mr-2" />
            Previous Frame
          </button>

          <button
            onClick={goToNextFrame}
            disabled={index === frames.length - 1}
            className={`px-4 py-2 rounded-md flex items-center ${
              index === frames.length - 1
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            Next Frame
            <ArrowRight size={16} className="ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FramePopup;
