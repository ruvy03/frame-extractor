import {
  ArrowLeft,
  ArrowRight,
  Download,
  Image,
  Loader,
  Video,
  X,
} from "lucide-react";

const FramePopup = ({ frame, index, onClose }) => {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = frame;
    link.download = `frame-${index + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-full overflow-hidden relative">
        <div className="p-4 flex justify-between items-center border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">
            Frame #{index + 1}
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
        <div className="flex items-center justify-center bg-black p-4 h-[60vh] overflow-auto">
          <img
            src={frame}
            alt={`Frame ${index + 1}`}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default FramePopup;
