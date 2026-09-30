import React, { useState, useEffect } from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { getActiveUser } from '../data/mockData';

interface WelcomeBannerProps {
  onStartFocus: () => void;
  syncCycle: number;
  userName?: string;
}

const getGreetingText = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  }
  if (hour >= 17 && hour < 21) {
    return 'Good evening';
  }
  return 'Good night';
};

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  onStartFocus,
  syncCycle,
  userName,
}) => {
  const [greetingPrefix, setGreetingPrefix] = useState(getGreetingText);
  const [name, setName] = useState<string>(() => userName || getActiveUser().name);

  useEffect(() => {
    if (userName) {
      setName(userName);
    }
  }, [userName]);

  useEffect(() => {
    const handleUserChange = () => {
      if (!userName) {
        setName(getActiveUser().name);
      }
    };
    window.addEventListener('nova_user_change', handleUserChange);
    return () => window.removeEventListener('nova_user_change', handleUserChange);
  }, [userName]);

  useEffect(() => {
    const updateGreeting = () => {
      setGreetingPrefix(getGreetingText());
    };

    const interval = setInterval(updateGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 mb-8">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          {/* Greeting */}
          <h1 className="text-3xl lg:text-[34px] font-bold text-[#131b2e] tracking-tight leading-tight">
            {greetingPrefix}, {name}.
          </h1>
        </div>
      </div>

      {/* "Ready to focus?" Action Banner Card */}
      <div className="bg-[#eefaf8] border border-[#a2e3d9]/70 rounded-2xl p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00685f] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Target className="w-6 h-6 text-[#89f5e7]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-[16px] font-bold text-[#131b2e]">
                Ready to focus?
              </span>
            </div>
            <p className="text-[13px] text-[#3d4947] mt-0.5">
              Start a 25-minute focus session and make progress on what matters.
            </p>
          </div>
        </div>

        <button
          onClick={onStartFocus}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#005049] text-white text-[13.5px] font-bold transition-all duration-150 shadow-sm hover:shadow-md cursor-pointer shrink-0"
        >
          <span>Start Focus Session</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
