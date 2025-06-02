'use client';

import React, { useEffect, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import { Cpu } from "lucide-react";
import LoginFormContent from "@/app/login/LoginFormContent";

if (typeof window !== "undefined") {
  gsap.registerPlugin(TextPlugin);
}

export default function AuthPage({ isRegister = false }) {
  // GSAP Animation Refs
  const descriptionRef = useRef<HTMLDivElement>(null);
  const inputBoxRef = useRef<HTMLDivElement>(null);
  const processingCircleRef = useRef<HTMLDivElement>(null);
  const outputBoxRef = useRef<HTMLDivElement>(null);
  const inputTextRef = useRef<HTMLSpanElement>(null);
  const outputTextRef = useRef<HTMLSpanElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const tableRowsRef = useRef<(HTMLDivElement | null)[]>([]);

  const sampleData = [
    { id: 1, name: "John Doe", age: 28 },
    { id: 2, name: "Jane Smith", age: 32 },
    { id: 3, name: "Mike Johnson", age: 27 },
    { id: 4, name: "Sarah Williams", age: 30 }
  ];

  useEffect(() => {
    const tl = gsap.timeline({ repeat: -1 });
  
    // Even faster animations
    tl.fromTo(
      descriptionRef.current,
      { opacity: 0, x: -20 },
      { opacity: 1, x: 0, duration: 0.2, ease: "power2.out" }
    ).to(descriptionRef.current, {
      text: "Express your query naturally",
      duration: 0.9,
      ease: "none"
    });
  
    tl.fromTo(
      inputBoxRef.current,
      { width: 0, opacity: 0 },
      { width: "100%", opacity: 1, duration: 0.3, ease: "power2.out" }
    );
  
    tl.to(inputTextRef.current, {
      text: "Show all users where age > 25",
      duration: 0.9,
      ease: "none"
    });
  
    tl.to(descriptionRef.current, {
      text: "AI transforms your request",
      duration: 0.9,
      ease: "none"
    });
  
    tl.fromTo(
      processingCircleRef.current,
      { opacity: 0, scale: 0, rotation: 0 },
      { opacity: 1, scale: 1, rotation: 360, duration: 0.5, ease: "back.out(1.7)" }
    );
  
    tl.to(descriptionRef.current, {
      text: "Get precise SQL and results",
      duration: 0.9,
      ease: "none"
    });
  
    tl.fromTo(
      outputBoxRef.current,
      { opacity: 0, scaleY: 0 },
      { opacity: 1, scaleY: 1, duration: 0.3, ease: "elastic.out(1, 0.75)" }
    ).to(outputTextRef.current, {
      text: "SELECT * FROM users WHERE age > 25;",
      duration: 0.9,
      ease: "none"
    });
  
    tl.fromTo(
      tableRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.2 }
    );
  
    tableRowsRef.current.forEach((row) => {
      if (row) {
        tl.fromTo(
          row,
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.1 },
          "-=0.05"
        );
      }
    });
  
    tl.to({}, { duration: 0.9 });
  
    tl.to(
      [
        descriptionRef.current,
        inputBoxRef.current,
        processingCircleRef.current,
        outputBoxRef.current,
        tableRef.current
      ],
      {
        opacity: 0,
        duration: 0.2,
        stagger: 0.05
      }
    );
  
    // Cleanup function to terminate timeline when component is removed
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div className="min-h-screen flex grid-pattern dark:bg-gray-900">
      {/* Left Side - GSAP Animation */}
      <div className="hidden lg:flex w-1/2 p-12 items-center justify-center relative">
        <div className="w-full max-w-xl">
          {/* Description Text */}
          <div 
            ref={descriptionRef}
            className="text-indigo-500 dark:text-indigo-400 text-2xl font-semibold mb-8"
          ></div>

          {/* GSAP Animation Container */}
          <div className="relative mt-8">
            {/* Input Box */}
            <div 
              ref={inputBoxRef}
              className="w-full h-[60px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-2 border-indigo-500 rounded-lg flex items-center px-4 mb-8"
            >
              <span ref={inputTextRef} className="text-indigo-700 dark:text-indigo-300"></span>
            </div>

            {/* Processing Circle */}
            <div 
              ref={processingCircleRef}
              className="w-[80px] h-[80px] mx-auto my-8 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"
            ></div>

            {/* Output Box */}
            <div 
              ref={outputBoxRef}
              className="w-full h-[60px] bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-2 border-indigo-500 rounded-lg flex items-center px-4 mb-8"
            >
              <span ref={outputTextRef} className="text-indigo-700 dark:text-indigo-300 font-mono"></span>
            </div>

            {/* Results Table */}
            <div 
              ref={tableRef}
              className="w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-2 border-indigo-500 rounded-lg overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-4 p-3 border-b-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30">
                <div className="text-indigo-700 dark:text-indigo-300 font-bold">ID</div>
                <div className="text-indigo-700 dark:text-indigo-300 font-bold">Name</div>
                <div className="text-indigo-700 dark:text-indigo-300 font-bold">Age</div>
              </div>
              {sampleData.map((row, index) => (
                <div
                  key={row.id}
                  ref={el => { if (el) tableRowsRef.current[index] = el; }}
                  className="grid grid-cols-3 gap-4 p-3 border-b border-indigo-200 dark:border-indigo-800"
                >
                  <div className="text-indigo-700 dark:text-indigo-300">{row.id}</div>
                  <div className="text-indigo-700 dark:text-indigo-300">{row.name}</div>
                  <div className="text-indigo-700 dark:text-indigo-300">{row.age}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        {/* نستخدم Suspense لتغليف المكون الذي يستخدم useSearchParams */}
        <Suspense 
          fallback={
            <div className="w-full max-w-md">
              <div className="glass-card p-8 flex flex-col items-center justify-center dark:bg-gray-800/90 dark:border-gray-700">
                <Cpu className="w-12 h-12 text-indigo-500 mb-4" />
                <div className="w-8 h-8 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">جاري تحميل النموذج...</p>
              </div>
            </div>
          }
        >
          <LoginFormContent isRegister={isRegister} />
        </Suspense>
      </div>
    </div>
  );
}