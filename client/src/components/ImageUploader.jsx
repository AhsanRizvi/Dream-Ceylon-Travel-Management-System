import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon, Trash2, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import api from '../services/api';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1546708973-b339540b5162?auto=format&fit=crop&w=600&q=80';

const ImageUploader = ({
  label = 'Upload Image',
  value,
  onChange,
  multiple = false,
  category = 'service',
  helperText = 'Accepted formats: JPG, PNG, WEBP, GIF (Max 5MB)'
}) => {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const images = multiple
    ? Array.isArray(value)
      ? value.filter(Boolean)
      : []
    : value
      ? [value]
      : [];

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    setError('');
    setUploading(true);

    try {
      const uploadedUrls = [];

      for (const file of selectedFiles) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
          throw new Error(`Unsupported file type "${file.type}". Please upload JPG, PNG, WEBP, or GIF.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`"${file.name}" exceeds the 5MB maximum file size limit.`);
        }

        const dataUrl = await fileToDataUrl(file);
        const res = await api.post('/uploads/image', {
          imageData: dataUrl,
          fileName: file.name,
          category
        });

        const returnedUrl = res.data?.url || res.data?.data?.url;
        if (returnedUrl) {
          uploadedUrls.push(returnedUrl);
        }
      }

      if (multiple) {
        onChange([...images, ...uploadedUrls]);
      } else if (uploadedUrls[0]) {
        onChange(uploadedUrls[0]);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Image upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setError('');
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/uploads/')) {
      setError('Please enter a valid http:// or https:// image URL');
      return;
    }

    if (multiple) {
      if (!images.includes(trimmed)) {
        onChange([...images, trimmed]);
      }
    } else {
      onChange(trimmed);
    }
    setUrlInput('');
  };

  const handleRemove = (indexToRemove) => {
    if (multiple) {
      onChange(images.filter((_, idx) => idx !== indexToRemove));
    } else {
      onChange('');
    }
  };

  return (
    <div className="space-y-2.5">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
          {label}
        </label>
      )}

      <div className="flex flex-col sm:flex-row gap-2.5">
        {/* File upload button */}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition disabled:opacity-50"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Uploading...' : multiple ? 'Upload Photos' : 'Upload Photo'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Or paste external URL */}
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="Or paste image URL (https://...)"
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition"
          >
            Add URL
          </button>
        </div>
      </div>

      {helperText && <p className="text-[11px] text-gray-400">{helperText}</p>}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
          <AlertCircle size={14} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Previews */}
      {images.length > 0 && (
        <div className={`grid gap-3 pt-1 ${multiple ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 max-w-xs'}`}>
          {images.map((imgUrl, idx) => (
            <div
              key={`${imgUrl}-${idx}`}
              className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-video shadow-2xs"
            >
              <img
                src={imgUrl}
                alt={`Preview ${idx + 1}`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                title="Remove image"
                className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-700 text-white p-1.5 rounded-lg shadow-sm transition"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-3">
          <ImageIcon size={16} className="text-gray-400" />
          <span>No image selected yet</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
