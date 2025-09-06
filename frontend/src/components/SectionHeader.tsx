'use client';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
}

export default function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="w-full max-w-4xl text-center mb-8">
      <h1 className="text-4xl font-bold">{title}</h1>
      <p className="text-lg text-gray-400 mt-2">{subtitle}</p>
    </div>
  );
}