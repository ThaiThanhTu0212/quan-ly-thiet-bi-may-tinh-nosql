'use client';
import { useState } from 'react';

const placeholder = '/product-placeholder.svg';
export default function ProductImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState('');
  const source = src?.trim() || placeholder;
  return <img src={failed === source ? placeholder : source} alt={alt} className={className}
    onError={() => setFailed(source)} />;
}
