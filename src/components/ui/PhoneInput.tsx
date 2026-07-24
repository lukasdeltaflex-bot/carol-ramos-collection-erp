import React from 'react';

interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({ value, onChange, className, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    
    // Apply mask
    if (val.length <= 10) {
      // Fixo: (XX) XXXX-XXXX
      val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
      val = val.replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      // Celular: (XX) XXXXX-XXXX
      val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
      val = val.replace(/(\d{5})(\d)/, '$1-$2');
    }
    
    // Limit length to 15 characters, e.g., (11) 99999-8888
    val = val.slice(0, 15);
    
    onChange(val);
  };

  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
};
