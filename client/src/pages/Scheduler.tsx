import { useEffect, useState } from "react";
import { dummyPostsData, PLATFORMS } from "../assets/assets";
import { preview } from "vite";


const Scheduler = () => {

  const [posts,setPosts]= useState<any[]>([]);
  const [content,setContent]=useState("");
  const [scheduleDate,setScheduleTime]=useState("");
  const[selectedPlatforms,setSelectedPlatforms]=useState<string[]>([]);
 const[mediaFile,setMediaFile]=useState<File| null>(null);
  const[loading,setLoading]=useState(false);

  const fetchPosts =async ()=> {
    setPosts(dummyPostsData)
  }

  useEffect(()=>{
      (async ()=> await fetchPosts())();
      const interval=setInterval(async ()=> await fetchPosts(),1000);
      return ()=> clearInterval(interval);
  },[])

  const scheduled=posts.filter((p)=> p.status === "scheduled")
    const published=posts.filter((p)=> p.status === "published")
  
    const togglePlatform=(id: string)=> setSelectedPlatforms((prev)=>(prev.includes(id) ? prev.filter((p)=> p! == id): [...prev,id]))

    const handleSchedule = async(e: React.FormEvent)=>{
        e.preventDefault()
        setLoading(true)
        setTimeout(()=>{
          setLoading(false)
          setPosts((prev)=> [...prev,dummyPostsData[0]])
        },1000)
    }
  
    return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* --Compose panel--*/}
      <div className="w-full lg:w-[460px] shrink-0">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
           <div className="flex items-center gap-2 mb-6">
            <h2 className="text-lg text-slate-700"> Compose Post</h2>
           </div>

           <form className="space-y-5" onSubmit={handleSchedule}>
            {/* Platforms */}
              <div>
                <label className="block text-xs text-slate-500 uppercase mb-2">Platforms

                </label>
               <div className="flex flex-wrap gap-3">
  {PLATFORMS.map((p) => {
    const active = selectedPlatforms.includes(p.id);

    return (
      <button 
        key={p.id}
        type="button" onClick={()=> togglePlatform(p.id)}
        className={`flex items-center gap-1.5 p-3 rounded-md border transition-all duration-150 ${
          active
            ? "bg-red-50 border-red-300 text-red-500 scale-105"
            : "border-slate-200 text-slate-500 hover:border-slate-300"
        }`}
      >
        <p.icon className="size-4.5" />
      </button>
    );
  })}
</div>
      </div>


            {/* Content */}

            <div>
              <label className="block text-xs text-slate-500 uppercase mb-2 ">Content
              </label>
              <textarea required rows={5} placeholder="What do you want to share today" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm placeholder-slate-400 outline-none resize-none" value={content} onChange={(e)=>setContent(e.target.value)}/>

                <div className={`text-right text-xs mt-1 font-medium ${content.length > 270? "text-red-500":"text-slate-400"} `}>
                  {content.length}/280
                </div>
            </div>


            {/* Media upload */}





            {/* Date & Time */}





            {/* Submit */}




           </form>
        </div>
      </div>

      {/* --Queue panel--*/}
    </div>
  )
}

export default Scheduler