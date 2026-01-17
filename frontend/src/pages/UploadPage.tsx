import { useState } from "react";
import { Upload, Music, AlertCircle, CheckCircle } from "lucide-react";
import WaveformPreview from "../components/music/WaveformPreview";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(0.5);
  const [genre, setGenre] = useState("Electronic");
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");

  const genres = [
    "Electronic",
    "Hip-Hop",
    "Ambient",
    "Jazz",
    "Rock",
    "Pop",
    "Classical",
    "World",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file size (50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("File size must be less than 50MB");
        return;
      }
      // Validate file type
      if (
        !["audio/mpeg", "audio/wav", "audio/ogg"].includes(selectedFile.type)
      ) {
        setError("Unsupported format. Use MP3, WAV, or OGG");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handlePublish = async () => {
    if (!file || !title) {
      setError("Please fill in all required fields");
      return;
    }

    setIsPublishing(true);
    // Simulate publishing delay
    setTimeout(() => {
      setIsPublishing(false);
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        // Reset form
        setFile(null);
        setTitle("");
        setDescription("");
        setPrice(0.5);
        setGenre("Electronic");
      }, 2000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-righteous text-4xl font-bold text-white sm:text-5xl">
            Upload Your Music
          </h1>
          <p className="mt-2 font-poppins text-slate-400">
            Share your track and start earning from every listen
          </p>
        </div>

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mb-6 rounded-lg border border-green-500/50 bg-green-500/10 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <p className="font-poppins font-semibold text-green-400">
                  Music published successfully!
                </p>
                <p className="font-poppins text-sm text-green-300">
                  Your track is now live and available for purchase
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="font-poppins text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Main Form */}
        <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur">
          {/* File Upload */}
          <div className="mb-8">
            <label className="block font-poppins font-semibold text-white mb-3">
              Audio File *
            </label>
            <div
              className="relative rounded-lg border-2 border-dashed border-slate-600 bg-slate-700/30 p-8 transition-all duration-200 hover:border-orange-400/50 cursor-pointer"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-lg bg-gradient-to-br from-orange-400/20 to-pink-400/20 p-4">
                  <Upload className="h-8 w-8 text-orange-400" />
                </div>
                <div>
                  <p className="font-poppins font-semibold text-white">
                    {file ? file.name : "Click to upload or drag and drop"}
                  </p>
                  <p className="font-poppins text-sm text-slate-400">
                    MP3, WAV, or OGG up to 50MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Waveform Preview */}
          {file && (
            <div className="mb-8">
              <label className="block font-poppins font-semibold text-white mb-3">
                Waveform Preview
              </label>
              <WaveformPreview file={file} />
            </div>
          )}

          {/* Title */}
          <div className="mb-6">
            <label
              htmlFor="title"
              className="block font-poppins font-semibold text-white mb-2"
            >
              Track Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter track title"
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 font-poppins text-white placeholder-slate-500 transition-all duration-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label
              htmlFor="description"
              className="block font-poppins font-semibold text-white mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Tell listeners about your track"
              rows={4}
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 font-poppins text-white placeholder-slate-500 transition-all duration-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 resize-none"
            />
          </div>

          {/* Genre */}
          <div className="mb-6">
            <label
              htmlFor="genre"
              className="block font-poppins font-semibold text-white mb-2"
            >
              Genre
            </label>
            <select
              id="genre"
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700/50 px-4 py-2 font-poppins text-white transition-all duration-200 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
            >
              {genres.map(g => (
                <option key={g} value={g} className="bg-slate-800">
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div className="mb-8">
            <label
              htmlFor="price"
              className="block font-poppins font-semibold text-white mb-2"
            >
              Price per Listen (SUI)
            </label>
            <div className="flex items-center gap-4">
              <input
                id="price"
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={price}
                onChange={e => setPrice(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="rounded-lg bg-slate-700/50 px-4 py-2 min-w-20">
                <p className="font-poppins font-bold text-orange-400">
                  {price.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          {/* Publish Button */}
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full group relative inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 px-8 py-4 font-poppins font-semibold text-white shadow-lg shadow-orange-500/50 transition-all duration-200 hover:shadow-orange-500/75 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPublishing ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Publishing...
              </>
            ) : (
              <>
                <Music className="h-5 w-5" />
                Publish to Chain
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
