import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
// Removed jsPDF and html2canvas imports
import { Upload, User, Building, Mail, Phone, MapPin, Plus, Trash2, Printer, FileText, Heart, AlertCircle, Hash, Map } from 'lucide-react'; // Removed Download icon

interface InvoiceItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

// Validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/; // Exactly 10 digits
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/; // Indian GST format
const ZIP_REGEX = /^\d{6}$/; // Basic 6-digit Indian PIN code

function App() {
  const [logo, setLogo] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>('Enter Business Name Here');
  // Biller State (Expanded)
  const [billerGstNumber, setBillerGstNumber] = useState<string>('');
  const [billerAddress, setBillerAddress] = useState<string>(''); // Street Address
  const [billerCity, setBillerCity] = useState<string>('');
  const [billerState, setBillerState] = useState<string>('');
  const [billerZip, setBillerZip] = useState<string>('');
  // Customer State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([{ id: Date.now(), name: '', quantity: 1, price: 0 }]);
  const [gstRate, setGstRate] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Validation Error State (Expanded Biller fields)
  const [errors, setErrors] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    billerGstNumber: '',
    billerAddress: '', // Street Address
    billerCity: '',
    billerState: '',
    billerZip: '',
  });

  // Form Validity State (Customer details still control Print/Download)
  const [isCustomerFormValid, setIsCustomerFormValid] = useState<boolean>(false);
  // Biller GST Validity State
  const [isBillerGstValid, setIsBillerGstValid] = useState<boolean>(false);
  // Optional: Add state for Biller Address validity if needed for other logic
  // const [isBillerAddressValid, setIsBillerAddressValid] = useState<boolean>(false);

  // --- Validation Functions ---
  const validateName = (name: string): string => {
    if (!name) return 'Name is required.';
    if (name.trim().length < 3) return 'Name must be at least 3 characters long.';
    return '';
  };

  const validateEmail = (email: string): string => {
    if (!email) return 'Email is required.';
    if (!EMAIL_REGEX.test(email)) return 'Please enter a valid email address.';
    return '';
  };

  const validatePhone = (phone: string): string => {
    const digitsOnly = phone.replace(/\D/g, '');
    if (!digitsOnly) return 'Phone number is required.';
    if (!PHONE_REGEX.test(digitsOnly)) return 'Phone number must be exactly 10 digits.';
    return '';
  };

  // Updated Address validation (can be used for both customer and biller street)
  const validateStreetAddress = (address: string, fieldName: string = 'Address'): string => {
    if (!address) return `${fieldName} is required.`;
    if (address.trim().length < 5) return `${fieldName} must be at least 5 characters long.`;
    return '';
  };

  // NEW: Basic validation for City, State, Zip (can be enhanced)
  const validateRequiredField = (value: string, fieldName: string): string => {
    if (!value || value.trim().length === 0) return `${fieldName} is required.`;
    return '';
  };

  const validateZip = (zip: string): string => {
    if (!zip) return 'Zip Code is required.';
    if (!ZIP_REGEX.test(zip)) return 'Zip Code must be 6 digits.';
    return '';
  };

  // GST Number Validation
  const validateGstNumber = (gst: string): string => {
    if (!gst) return ''; // GST is optional
    const upperCaseGst = gst.toUpperCase();
    if (!GST_REGEX.test(upperCaseGst)) return 'Invalid GST Number format.';
    return '';
  };

  // --- Effect to check overall CUSTOMER form validity ---
  useEffect(() => {
    const nameError = validateName(customerName);
    const emailError = validateEmail(customerEmail);
    const phoneError = validatePhone(customerPhone);
    const addressError = validateStreetAddress(customerAddress, 'Customer Address'); // Use specific validator

    const isValid = !nameError && !emailError && !phoneError && !addressError;
    setIsCustomerFormValid(isValid);

  }, [customerName, customerEmail, customerPhone, customerAddress]);

  // --- Effect to check BILLER GST validity ---
  useEffect(() => {
    const gstError = validateGstNumber(billerGstNumber);
    setIsBillerGstValid(!!billerGstNumber && !gstError); // Valid if present and no error
    if (!billerGstNumber || gstError) {
        setGstRate(0);
    }
  }, [billerGstNumber]);

  // Optional: Effect to check Biller Address validity (if needed elsewhere)
  // useEffect(() => {
  //   const addressError = validateStreetAddress(billerAddress, 'Biller Address');
  //   const cityError = validateRequiredField(billerCity, 'City');
  //   const stateError = validateRequiredField(billerState, 'State');
  //   const zipError = validateZip(billerZip);
  //   setIsBillerAddressValid(!addressError && !cityError && !stateError && !zipError);
  // }, [billerAddress, billerCity, billerState, billerZip]);


  // --- Input Change Handlers with Validation ---
  const handleCustomerChange = (field: keyof typeof errors, value: string, validator: (val: string, fieldName?: string) => string) => {
    if (field === 'customerName') setCustomerName(value);
    else if (field === 'customerEmail') setCustomerEmail(value);
    else if (field === 'customerPhone') setCustomerPhone(value);
    else if (field === 'customerAddress') setCustomerAddress(value);

    setErrors(prevErrors => ({
      ...prevErrors,
      [field]: validator(value, field === 'customerAddress' ? 'Customer Address' : undefined),
    }));
  };

  // Updated: Biller Change Handler for multiple fields
  const handleBillerChange = (
    field: 'billerGstNumber' | 'billerAddress' | 'billerCity' | 'billerState' | 'billerZip',
    value: string
  ) => {
    let error = '';
    let stateUpdater: React.Dispatch<React.SetStateAction<string>> | null = null;

    switch (field) {
      case 'billerGstNumber':
        const upperCaseValue = value.toUpperCase();
        setBillerGstNumber(upperCaseValue);
        error = validateGstNumber(upperCaseValue);
        break;
      case 'billerAddress':
        setBillerAddress(value);
        error = validateStreetAddress(value, 'Biller Address'); // Optional validation
        break;
      case 'billerCity':
        setBillerCity(value);
        error = validateRequiredField(value, 'City'); // Basic required validation
        break;
      case 'billerState':
        setBillerState(value);
        error = validateRequiredField(value, 'State'); // Basic required validation
        break;
      case 'billerZip':
        setBillerZip(value);
        error = validateZip(value);
        break;
    }

    setErrors(prevErrors => ({
      ...prevErrors,
      [field]: error,
    }));
  };


  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogo(e.target?.result as string);
      };
      reader.readAsDataURL(event.target.files[0]);
    }
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), name: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id: number, field: keyof InvoiceItem, value: string | number) => {
    const numValue = Number(value);
    if ((field === 'quantity' || field === 'price') && numValue < 0) {
      value = 0;
    }
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateSubtotal = () => {
    return items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price)), 0);
  };

  // Updated: Calculate GST only if Biller GST is valid
  const calculateGST = (subtotal: number) => {
    if (!isBillerGstValid) return 0;
    return subtotal * (Number(gstRate) / 100);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const gst = calculateGST(subtotal);
    return subtotal + gst + Number(shippingFee);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const subtotal = calculateSubtotal();
  const gstAmount = calculateGST(subtotal);
  const total = calculateTotal();

  // REMOVED generatePDF function

  const handlePrint = () => {
     if (!isCustomerFormValid) {
        alert("Please fix the errors in the customer details before printing.");
        setErrors(prev => ({
            ...prev,
            customerName: validateName(customerName),
            customerEmail: validateEmail(customerEmail),
            customerPhone: validatePhone(customerPhone),
            customerAddress: validateStreetAddress(customerAddress, 'Customer Address'),
        }));
        return;
     }
     window.print();
  };

  // Common button classes
  const buttonClasses = "text-white font-semibold py-2 px-5 rounded-md inline-flex items-center transition duration-200 ease-in-out shadow hover:shadow-md";
  const disabledButtonClasses = "bg-gray-400 cursor-not-allowed";
  // Removed enabledPdfButtonClasses
  const enabledPrintButtonClasses = "bg-gray-500 hover:bg-gray-600";


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4 md:p-8 print:p-0 print:bg-white">
      <style>
        {`
          @media print {
            /* --- General Print Reset --- */
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              background-color: #fff !important;
              margin: 0;
              padding: 0;
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            }
            .no-print { display: none !important; }
            .print-container { padding: 0 !important; margin: 0 !important; box-shadow: none !important; border: none !important; background-color: #fff !important; }
            /* --- Modern Invoice Layout (A4) --- */
             .invoice-preview {
               box-shadow: none !important;
               border: none !important; /* NO BORDERS */
               margin: 0 auto !important; /* Center on page if needed */
               padding: 15mm !important; /* Standard A4 margins */
               width: 210mm; /* A4 width */
               min-height: 297mm; /* A4 height - ensures footer is at bottom */
               box-sizing: border-box;
               background-color: #fff !important;
               display: flex; /* Use flexbox for layout */
               flex-direction: column; /* Stack elements vertically */
             }
             /* Ensure text is black for print */
             .invoice-preview, .invoice-preview * {
                color: #000 !important;
                border-color: #ccc !important; /* Light grey for subtle lines if needed */
             }

             /* --- Header Section --- */
             .print-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 8mm;
                padding-bottom: 4mm;
                border-bottom: 1px solid #eee; /* Subtle separator line */
             }
             .print-logo-area {
                max-width: 55%;
             }
             .print-logo {
                max-height: 20mm; /* Slightly smaller logo */
                width: auto;
                object-fit: contain;
                margin-bottom: 2mm;
             }
             .print-biller-details {
                 font-size: 0.85rem;
                 line-height: 1.4;
                 color: #444 !important;
                 margin-top: 3mm;
             }
             .print-biller-details p {
                 margin-bottom: 0.5mm;
             }
             .print-business-name {
                 font-size: 1.4rem; /* Adjust size */
                 font-weight: bold;
                 margin-bottom: 1mm;
                 color: #1a202c !important;
             }
             .print-invoice-details {
                text-align: right;
             }
             .print-invoice-title {
                font-size: 1.6rem; /* Adjust size */
                font-weight: bold;
                margin-bottom: 2mm;
                color: #333 !important;
                text-transform: uppercase;
             }
             .print-invoice-meta p {
                 font-size: 0.9rem;
                 line-height: 1.4;
                 margin-bottom: 0.5mm;
                 color: #555 !important;
             }

             /* --- Customer Info Section --- */
             .print-customer-info {
                 margin-bottom: 8mm;
                 padding-bottom: 4mm;
                 border-bottom: 1px solid #eee; /* Subtle separator line */
             }
             .print-customer-info h3 {
                 font-size: 1rem;
                 font-weight: bold;
                 margin-bottom: 3mm;
                 color: #333 !important;
                 text-transform: uppercase;
                 letter-spacing: 0.5px;
             }
             .print-customer-details {
                 font-size: 0.9rem;
                 line-height: 1.5;
                 color: #444 !important;
             }
             .print-customer-details p {
                 margin-bottom: 1mm;
             }

             /* --- Items Table --- */
             .print-items-section {
                 margin-bottom: 8mm;
                 flex-grow: 1; /* Allow table to grow */
             }
             .print-items-section h3 {
                 font-size: 1rem;
                 font-weight: bold;
                 margin-bottom: 4mm;
                 color: #333 !important;
                 text-transform: uppercase;
                 letter-spacing: 0.5px;
             }
             .print-table {
                 width: 100%;
                 border-collapse: collapse; /* Remove gaps between cells */
             }
             .print-table th {
                background-color: #f9fafb !important; /* Very light gray header */
                padding: 3mm 2mm !important;
                text-align: right;
                font-weight: bold; /* Bolder headers */
                font-size: 0.85rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                border-bottom: 1px solid #ddd; /* Slightly darker bottom border for header */
             }
             .print-table th:first-child {
                text-align: left;
             }
             .print-table td {
                padding: 3mm 2mm !important;
                border-bottom: 1px solid #f3f4f6; /* Very subtle line between rows */
                text-align: right;
                font-size: 0.9rem;
                vertical-align: top; /* Align content top */
             }
             .print-table td:first-child {
                text-align: left;
             }
             /* Remove border from last row */
             .print-table tr:last-child td {
                 border-bottom: none;
             }

             /* --- Totals Section --- */
             .print-totals {
                margin-top: auto; /* Push totals towards the bottom if space allows */
                padding-top: 5mm;
                border-top: 1px solid #eee; /* Subtle separator line */
                display: flex;
                justify-content: flex-end;
             }
             .print-totals-table {
                width: 45%; /* Adjust width */
             }
             .print-totals-table td {
                padding: 1.5mm 0; /* Tighter padding */
                font-size: 0.9rem;
             }
             .print-totals-table td:last-child {
                 text-align: right;
                 font-weight: 500; /* Medium weight */
             }
             .print-totals-table tr:last-child td {
                font-weight: bold;
                font-size: 1.1rem;
                color: #1a202c !important;
                padding-top: 3mm;
             }

             /* --- Footer Section --- */
             .print-footer {
                margin-top: 10mm; /* Space before footer */
                padding-top: 5mm;
                text-align: center;
                font-size: 0.8rem;
                color: #777 !important;
             }
             /* Ensure ALL footer credits are NOT displayed in print/PDF */
             .footer-credit, .footer-credit-screen-only { display: none !important; }
          }
          /* Screen-only styles */
          .footer-credit { display: none; }
          .footer-credit-screen-only { display: block; }
        `}
      </style>
      <div className="max-w-5xl mx-auto bg-white shadow-2xl rounded-lg print-container">
        {/* Invoice Header (Buttons Removed) */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-6 rounded-t-lg flex flex-col md:flex-row justify-between items-center no-print">
          <h1 className="text-3xl font-bold flex items-center mb-4 md:mb-0">
            <FileText className="mr-3 h-8 w-8" /> Instant Invoice Generator
          </h1>
        </div>

        {/* Invoice Content Area */}
        <div ref={invoiceRef} className="p-6 md:p-10 invoice-preview bg-white">
          {/* --- Printable Header --- */}
          <div className="print-header">
             <div className="print-logo-area">
               {/* Logo & Business Name */}
               <div className="flex items-start mb-4">
                 {logo ? (
                   <img src={logo} alt="Business Logo" className="print-logo max-h-16 w-auto mr-4 object-contain" />
                 ) : (
                   <div className="h-16 w-16 bg-gray-200 flex items-center justify-center rounded mr-4 text-gray-500 print:hidden">
                     <Building size={32} />
                   </div>
                 )}
                 <div>
                    <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Enter Business Name Here"
                        className="text-2xl font-bold border-b-2 border-transparent focus:border-indigo-500 outline-none w-full mb-1 print:hidden"
                    />
                    <h2 className="text-2xl font-bold hidden print:block print-business-name">{businessName}</h2>
                    <div className="relative mt-1 no-print">
                        <label htmlFor="logo-upload" className="cursor-pointer bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium py-1.5 px-3 rounded-md inline-flex items-center transition duration-150 ease-in-out">
                        <Upload className="mr-1.5 h-4 w-4" /> Upload Logo
                        </label>
                        <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </div>
                 </div>
               </div>

               {/* Biller Details Inputs (Screen Only) - Reordered & Expanded */}
               <div className="space-y-3 mt-4 no-print">
                  {/* GST Number */}
                  <div>
                     <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                       <Hash className="mr-2 h-4 w-4 text-gray-400" /> Biller GST Number (Optional)
                     </label>
                     <input
                       type="text"
                       value={billerGstNumber}
                       onChange={(e) => handleBillerChange('billerGstNumber', e.target.value)}
                       placeholder="Enter if applicable for GST Invoice"
                       className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 uppercase ${errors.billerGstNumber ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                     />
                     {errors.billerGstNumber && <p className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.billerGstNumber}</p>}
                  </div>
                  {/* Street Address */}
                  <div>
                     <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                       <MapPin className="mr-2 h-4 w-4 text-gray-400" /> Biller Street Address
                     </label>
                     <input
                       type="text"
                       value={billerAddress}
                       onChange={(e) => handleBillerChange('billerAddress', e.target.value)}
                       placeholder="Street Name, Building No."
                       className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 ${errors.billerAddress ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                     />
                     {errors.billerAddress && <p className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.billerAddress}</p>}
                  </div>
                  {/* City, State, Zip Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* City */}
                      <div>
                         <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                           <Building className="mr-2 h-4 w-4 text-gray-400" /> City
                         </label>
                         <input
                           type="text"
                           value={billerCity}
                           onChange={(e) => handleBillerChange('billerCity', e.target.value)}
                           placeholder="City"
                           className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 ${errors.billerCity ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                         />
                         {errors.billerCity && <p className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.billerCity}</p>}
                      </div>
                      {/* State */}
                      <div>
                         <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                           <Map className="mr-2 h-4 w-4 text-gray-400" /> State
                         </label>
                         <input
                           type="text"
                           value={billerState}
                           onChange={(e) => handleBillerChange('billerState', e.target.value)}
                           placeholder="State"
                           className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 ${errors.billerState ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                         />
                         {errors.billerState && <p className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.billerState}</p>}
                      </div>
                      {/* Zip Code */}
                      <div>
                         <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                           <Map className="mr-2 h-4 w-4 text-gray-400"                           /> Zip Code
                         </label>
                         <input
                           type="text" // Use text for easier input, validation handles digits
                           maxLength={6}
                           value={billerZip}
                           onChange={(e) => handleBillerChange('billerZip', e.target.value)}
                           placeholder="6-digit Zip"
                           className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 ${errors.billerZip ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                         />
                         {errors.billerZip && <p className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.billerZip}</p>}
                      </div>
                  </div>
               </div>

               {/* Biller Details (Print Display) - Updated Format */}
               <div className="hidden print:block print-biller-details">
                  {isBillerGstValid && billerGstNumber && <p>GSTIN: {billerGstNumber}</p>}
                  {billerAddress && <p>{billerAddress}</p>}
                  {(billerCity || billerState || billerZip) &&
                    <p>
                        {billerCity}{billerCity && billerState ? ', ' : ''}{billerState}{ (billerCity || billerState) && billerZip ? ' - ' : ''}{billerZip}
                    </p>
                  }
               </div>
             </div>

             {/* Invoice Meta Details */}
             <div className="print-invoice-details">
               <h2 className="print-invoice-title">Invoice</h2>
               <div className="hidden print:block print-invoice-meta">
                 <p>Invoice #: INV-{Date.now().toString().slice(-6)}</p>
                 <p>Date: {new Date().toLocaleDateString()}</p>
               </div>
               <div className="print:hidden">
                 <p className="text-gray-600">Invoice #: INV-{Date.now().toString().slice(-6)}</p>
                 <p className="text-gray-600">Date: {new Date().toLocaleDateString()}</p>
               </div>
             </div>
          </div>

          {/* --- Customer Info with Validation --- */}
          <div className="my-8 py-6 border-y border-gray-200 print:border-y-0 print:py-0 print:my-0 print-customer-info">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 print:text-base print:mb-3">Bill To:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 print:hidden">
              {/* Name Input */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                  <User className="mr-2 h-4 w-4 text-gray-400" /> Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => handleCustomerChange('customerName', e.target.value, validateName)}
                  placeholder="Customer Name"
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 ${errors.customerName ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                  aria-invalid={!!errors.customerName}
                  aria-describedby="customerName-error"
                />
                {errors.customerName && <p id="customerName-error" className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.customerName}</p>}
              </div>
              {/* Email Input */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                  <Mail className="mr-2 h-4 w-4 text-gray-400" /> Email *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => handleCustomerChange('customerEmail', e.target.value, validateEmail)}
                  placeholder="Customer Email"
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 ${errors.customerEmail ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                   aria-invalid={!!errors.customerEmail}
                   aria-describedby="customerEmail-error"
                />
                 {errors.customerEmail && <p id="customerEmail-error" className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.customerEmail}</p>}
              </div>
              {/* Phone Input */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                  <Phone className="mr-2 h-4 w-4 text-gray-400" /> Phone *
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => handleCustomerChange('customerPhone', e.target.value, validatePhone)}
                  placeholder="10-digit Phone Number"
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 ${errors.customerPhone ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                   aria-invalid={!!errors.customerPhone}
                   aria-describedby="customerPhone-error"
                />
                 {errors.customerPhone && <p id="customerPhone-error" className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.customerPhone}</p>}
              </div>
              {/* Customer Address Input */}
              <div>
                <label className="flex items-center text-sm font-medium text-gray-600 mb-1">
                  <MapPin className="mr-2 h-4 w-4 text-gray-400" /> Customer Address *
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => handleCustomerChange('customerAddress', e.target.value, validateStreetAddress)} // Use street validator
                  placeholder="Customer Full Address"
                  className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 transition duration-150 ${errors.customerAddress ? 'border-red-500 focus:ring-red-300' : 'border-gray-300 focus:ring-indigo-300 focus:border-indigo-400'}`}
                   aria-invalid={!!errors.customerAddress}
                   aria-describedby="customerAddress-error"
                />
                 {errors.customerAddress && <p id="customerAddress-error" className="text-red-600 text-xs mt-1 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.customerAddress}</p>}
              </div>
            </div>
             {/* Print Layout */}
             <div className="hidden print:block print-customer-details">
                {customerName && <p><strong>{customerName}</strong></p>}
                {customerAddress && <p>{customerAddress}</p>}
                {customerEmail && <p>Email: {customerEmail}</p>}
                {customerPhone && <p>Phone: {customerPhone}</p>}
             </div>
          </div>

          {/* --- Invoice Items Table --- */}
          <div className="mb-8 print:mb-0 print-items-section">
             <h3 className="text-lg font-semibold text-gray-700 mb-4 print:text-base print:mb-3">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse print-table">
                <thead>
                  <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600 uppercase print:bg-gray-50">
                    <th className="p-3 print:p-2">Description</th>
                    <th className="p-3 w-24 text-right print:p-2 print:w-20">Qty</th>
                    <th className="p-3 w-32 text-right print:p-2 print:w-28">Price</th>
                    <th className="p-3 w-32 text-right print:p-2 print:w-32">Subtotal</th>
                    <th className="p-3 w-12 text-center no-print"></th> {/* Action column header */}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 print:border-b-0">
                      <td className="p-3 print:p-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="Service or Product"
                          className="w-full p-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 transition duration-150 print:hidden"
                        />
                        <span className="hidden print:inline">{item.name || '-'}</span>
                      </td>
                      <td className="p-3 text-right print:p-2">
                        <input
                          type="number"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                          className="w-20 p-1.5 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 transition duration-150 print:hidden"
                        />
                         <span className="hidden print:inline">{item.quantity}</span>
                      </td>
                      <td className="p-3 text-right print:p-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))}
                          className="w-24 p-1.5 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 transition duration-150 print:hidden"
                        />
                         <span className="hidden print:inline">{formatCurrency(Number(item.price))}</span>
                      </td>
                      <td className="p-3 text-right font-medium text-gray-700 print:p-2">
                        {formatCurrency(Number(item.quantity) * Number(item.price))}
                      </td>
                      <td className="p-3 text-center no-print">
                        <button onClick={() => removeItem(item.id)} className="text-red-500 hover:text-red-700 transition duration-150">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={addItem}
              className="mt-5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md inline-flex items-center transition duration-150 ease-in-out no-print shadow hover:shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </button>
          </div>

          {/* --- Totals Section --- */}
          <div className="flex justify-end mb-8 print:mb-0 print-totals">
             <div className="w-full md:w-2/5 print-totals-table">
              {/* Screen Layout */}
              <div className="print:hidden">
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium text-gray-800">{formatCurrency(subtotal)}</span>
                  </div>
                  {/* Conditionally render GST row */}
                  {isBillerGstValid && (
                    <div className="flex justify-between items-center py-1.5 border-t border-gray-100">
                        <label className="text-gray-600 flex items-center">
                        GST (%):
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={gstRate}
                            onChange={(e) => setGstRate(Math.max(0, Number(e.target.value)))}
                            className="w-16 ml-2 p-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 transition duration-150"
                        />
                        </label>
                        <span className="font-medium text-gray-800">{formatCurrency(gstAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1.5">
                     <label className="text-gray-600 flex items-center">
                       Shipping:
                       <input
                         type="number"
                         step="0.01"
                         min="0"
                         value={shippingFee}
                         onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value)))}
                         className="w-20 ml-2 p-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 focus:border-indigo-400 transition duration-150"
                       />
                     </label>
                    <span className="font-medium text-gray-800">{formatCurrency(Number(shippingFee))}</span>
                  </div>
                  <div className="flex justify-between py-2.5 border-t-2 border-gray-300 mt-2">
                    <span className="text-lg font-bold text-gray-900">Total:</span>
                    <span className="text-lg font-bold text-indigo-600">{formatCurrency(total)}</span>
                  </div>
              </div>
              {/* Print Layout */}
              <table className="hidden print:table w-full">
                  <tbody>
                      <tr><td>Subtotal:</td><td>{formatCurrency(subtotal)}</td></tr>
                      {isBillerGstValid && gstRate > 0 && <tr><td>GST ({gstRate}%):</td><td>{formatCurrency(gstAmount)}</td></tr>}
                      {shippingFee > 0 && <tr><td>Shipping:</td><td>{formatCurrency(Number(shippingFee))}</td></tr>}
                      <tr className="font-bold text-lg"><td>Total:</td><td>{formatCurrency(total)}</td></tr>
                  </tbody>
              </table>
            </div>
          </div>

          {/* --- Footer / Notes / Credits --- */}
          <div className="mt-10 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm print:border-t-0 print:pt-0 print-footer">
            <p className="mb-2 footer-credit-screen-only">
                Made with <Heart size={12} className="inline text-red-500 mx-0.5" /> by Naman Gupta!
            </p>
            <p className="mt-4 footer-credit hidden">
              With <Heart size={12} className="inline text-red-500 mx-0.5" /> by Naman Gupta
            </p>
          </div>
        </div> {/* End of invoiceRef */}

        {/* Action Buttons Container (Moved Here) */}
        <div className="p-6 md:px-10 pb-8 flex justify-center space-x-4 no-print action-buttons-container">
            {/* REMOVED Download PDF Button */}
            {/* <button
              onClick={generatePDF}
              disabled={!isCustomerFormValid}
              className={`${buttonClasses} ${isCustomerFormValid ? enabledPdfButtonClasses : disabledButtonClasses}`}
              title={!isCustomerFormValid ? "Please fill in all required customer details correctly." : "Download Invoice as PDF"}
            >
              <Download className="mr-2 h-5 w-5" /> Download PDF
            </button> */}
            <button
              onClick={handlePrint}
              disabled={!isCustomerFormValid}
              className={`${buttonClasses} ${isCustomerFormValid ? enabledPrintButtonClasses : disabledButtonClasses}`}
              title={!isCustomerFormValid ? "Please fill in all required customer details correctly." : "Print Invoice"}
            >
              <Printer className="mr-2 h-5 w-5" /> Print
            </button>
        </div>

      </div> {/* End of max-w-5xl container */}
    </div>
  );
}

export default App;
