"use client";

import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div 
        className="w-full max-w-6xl rounded-2xl overflow-hidden flex min-h-[600px] shadow-lg"
        style={{
          border: '1px solid #E3E3E3',
        }}
      >
        {/* Left Panel - Login Form */}
        <div className="w-1/2 bg-white p-12 flex flex-col items-center justify-center relative">
          {/* Logo */}
          <div className="mb-20">
            <Image
              src="/full-logo.svg"
              alt="eyeRadar Logo"
              width={180}
              height={40}
              className="h-auto"
            />
          </div>

          {/* Welcome Back Title */}
          <h1 className="font-['Inter',_sans-serif] font-semibold text-[30px] leading-[48px] text-[#1B1B1C] mb-10 text-center">
            Welcome Back
          </h1>

          {/* Login Separator */}
          <div className="flex items-center gap-4 mb-12 w-full max-w-md">
            <div className="flex-1 h-px bg-[#E3E3E3]"></div>
            <span className="font-['Inter',_sans-serif] font-normal text-[14px] leading-[20px] text-[#919191]">
              Login
            </span>
            <div className="flex-1 h-px bg-[#E3E3E3]"></div>
          </div>

          {/* Login Form */}
          <div className="w-full max-w-md space-y-6">
            {/* Email/Phone/ID Input */}
            <div>
              <label className="block font-['Inter',_sans-serif] font-normal text-[14px] leading-[20px] text-[#303030] mb-2">
                Email, Phone or ID
              </label>
              <input
                type="text"
                placeholder="email@example.com"
                className="w-full px-4 py-3 rounded-lg bg-[#F8F8F8] border border-[#E3E3E3] font-['Inter',_sans-serif] font-normal text-[14px] leading-[20px] text-[#303030] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#FF5A39] transition-colors"
              />
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-['Inter',_sans-serif] font-normal text-[14px] leading-[20px] text-[#303030]">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="font-['Inter',_sans-serif] font-normal text-[14px] leading-[20px] text-[#a1a1a1] italic hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg bg-[#F8F8F8] border border-[#E3E3E3] font-['Inter',_sans-serif] font-normal text-[14px] leading-[20px] text-[#303030] placeholder:text-[#ABABAB] focus:outline-none focus:border-[#FF5A39] transition-colors"
              />
            </div>

            {/* Login Button */}
            <button
              className="w-full py-3 rounded-lg font-['Inter',_sans-serif] text-[16px] leading-[24px] text-white transition-opacity hover:opacity-90"
              style={{
                background: "linear-gradient(90deg, #FF5A39 0%, #FF9E75 100%)",
              }}
            >
              Login
            </button>
          </div>

          {/* Support Link */}
          <div className="mt-auto pt-8 text-center">
            <span className="font-['Inter',_sans-serif] font-normal text-[16px] leading-[24px] text-[#a1a1a1]">
              Need support? <a href="mailto:support@eyeRadar.com" className="text-[#a1a1a1] font-semibold hover:underline">Contact us</a>
            </span>
          </div>
        </div>

        {/* Right Panel - Branding Graphic */}
        <div
          className="w-1/2 relative flex items-center justify-center min-h-[600px]"
          style={{
            background: "linear-gradient(180deg, #FF7F50 0%, #FF5733 100%)",
          }}
        >
          <Image
            src="/login-page.png"
            alt="Login Page Graphic"
            width={600}
            height={600}
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
