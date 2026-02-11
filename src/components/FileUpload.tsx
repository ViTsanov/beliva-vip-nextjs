"use client";

import React, { useState } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FileText, UploadCloud, X, Loader2, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
}

export default function FileUpload({ label = "Качи файл", value, onChange, folder = "documents" }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
        alert('Моля, изберете PDF файл!');
        return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const storageRef = ref(storage, `${folder}/${timestamp}_${file.name}`);
      
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      onChange(url);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Грешка при качването на файла.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="text-[10px] font-black uppercase text-gray-400 block">{label}</label>}
      
      {!value ? (
        <div className="relative border-2 border-dashed border-gray-300 rounded-xl p-6 hover:bg-gray-50 transition-colors text-center group cursor-pointer">
          <input 
            type="file" 
            accept=".pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            disabled={uploading}
          />
          <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-brand-dark transition-colors">
            {uploading ? (
                <>
                    <Loader2 className="animate-spin text-brand-gold" size={24} />
                    <span className="text-xs font-bold">Качване...</span>
                </>
            ) : (
                <>
                    <UploadCloud size={24} />
                    <span className="text-xs font-bold">Натисни за избор на PDF</span>
                </>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="bg-white p-2 rounded-lg text-emerald-600 shadow-sm">
                <FileText size={20} />
            </div>
            <div className="flex-grow overflow-hidden">
                <p className="text-xs font-bold text-emerald-800 truncate">Успешно прикачен файл</p>
                <a 
                    href={value} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[10px] text-emerald-600 underline hover:text-emerald-800 truncate block"
                >
                    Преглед на файла
                </a>
            </div>
            <button 
                type="button"
                onClick={() => onChange('')} 
                className="p-2 bg-white text-red-400 rounded-lg hover:text-red-600 hover:shadow-sm transition-all"
                title="Премахни файла"
            >
                <X size={16} />
            </button>
            <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                <CheckCircle2 size={12} />
            </div>
        </div>
      )}
    </div>
  );
}