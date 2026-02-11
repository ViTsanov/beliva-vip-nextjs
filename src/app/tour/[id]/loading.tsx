import { Image as ImageIcon } from "lucide-react";

export default function Loading() {
  return (
    <div className="bg-gray-50 min-h-screen pb-20 animate-pulse">
      
      {/* HERO SKELETON */}
      <div className="relative h-[80vh] w-full bg-gray-300">
        <div className="absolute inset-0 flex items-center justify-center">
             <ImageIcon className="text-gray-400 w-20 h-20 opacity-50" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 -mt-20 relative z-30">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* MAIN CONTENT */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Quick Info Cards Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-5 rounded-3xl shadow-sm h-32 flex flex-col justify-between">
                   <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                   <div className="space-y-2">
                      <div className="w-12 h-2 bg-gray-200 rounded"></div>
                      <div className="w-20 h-4 bg-gray-300 rounded"></div>
                   </div>
                </div>
              ))}
            </div>

            {/* General Info Skeleton */}
            <div className="bg-white p-12 rounded-[2.5rem] h-64 shadow-sm">
                <div className="w-1/3 h-8 bg-gray-200 rounded mb-6"></div>
                <div className="space-y-3">
                    <div className="w-full h-4 bg-gray-200 rounded"></div>
                    <div className="w-full h-4 bg-gray-200 rounded"></div>
                    <div className="w-2/3 h-4 bg-gray-200 rounded"></div>
                </div>
            </div>

          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-4">
            <div className="sticky top-28">
               <div className="bg-gray-800 p-8 rounded-[3rem] h-96 shadow-xl opacity-10"></div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}