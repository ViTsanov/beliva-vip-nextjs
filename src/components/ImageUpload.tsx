"use client";

import React, { useState } from 'react';
import { storage } from '@/lib/firebase'; // Внимавай с пътя!
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, Loader2, X, Image as ImageIcon } from 'lucide-react';
import { convertToWebP } from '@/lib/utils/imageConverter'; // Оправен път

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export default function ImageUpload({ label, value, onChange, folder = 'uploads' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const originalFile = e.target.files?.[0];
    if (!originalFile) return;

    setUploading(true);
    try {
      const { blob, fileName } = await convertToWebP(originalFile);
      const uniqueName = `${Date.now()}-${fileName}`;
      const storageRef = ref(storage, `${folder}/${uniqueName}`);
      
      await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(storageRef);
      onChange(url);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Грешка при качване.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-gray-400 block">{label}</label>
      
      <div className="flex gap-4 items-start">
        <div className="relative flex-grow">
          <input 
            type="text" 
            placeholder="https://..." 
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full p-3 pl-12 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-brand-gold text-sm transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <ImageIcon size={18} />
          </div>
        </div>

        <div className="relative shrink-0">
          <input 
            type="file" 
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <button 
            type="button"
            className="bg-white border border-gray-200 text-brand-dark px-4 py-3 rounded-xl font-bold uppercase text-[10px] hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
          >
            {uploading ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>}
            {uploading ? 'WebP...' : 'Качи файл'}
          </button>
        </div>
      </div>

      {value && (
        <div className="mt-2 relative w-32 h-32 rounded-2xl overflow-hidden border border-gray-200 shadow-md group">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <button 
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}