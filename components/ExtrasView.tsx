import React, { useState } from 'react';
import { CheckSquare, Square, Wallet, CloudSun, Languages } from 'lucide-react';

export const ExtrasView: React.FC = () => {
  const [packingList, setPackingList] = useState([
    { id: 1, text: 'דרכון בתוקף', checked: true },
    { id: 2, text: 'כרטיסי טיסה מודפסים', checked: true },
    { id: 3, text: 'מתאם חשמל', checked: false },
    { id: 4, text: 'מטען נייד', checked: false },
    { id: 5, text: 'תרופות קבועות', checked: false },
  ]);

  const toggleItem = (id: number) => {
    setPackingList(packingList.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Packing List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <CheckSquare className="ml-2 text-green-600" /> רשימת ציוד
        </h3>
        <ul className="space-y-3">
          {packingList.map(item => (
            <li 
              key={item.id} 
              className={`flex items-center cursor-pointer p-2 rounded hover:bg-gray-50 transition-colors ${item.checked ? 'opacity-50 line-through text-gray-500' : 'text-gray-800'}`}
              onClick={() => toggleItem(item.id)}
            >
              {item.checked ? <CheckSquare className="w-5 h-5 ml-2 text-green-500" /> : <Square className="w-5 h-5 ml-2 text-gray-400" />}
              {item.text}
            </li>
          ))}
        </ul>
      </div>

      {/* Ideas Card */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Wallet className="ml-2 text-purple-600" /> ניהול תקציב (רעיון)
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            מומלץ להוריד אפליקציה כמו 'TravelSpend' או להשתמש בגיליון אקסל משותף למעקב אחרי הוצאות בזמן אמת.
            שער המרה משוער: 100 באט = 11 ש"ח.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <Languages className="ml-2 text-blue-600" /> תאילנדית למטייל
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div className="p-2 bg-gray-50 rounded">סוואדי קראפ/קה (שלום)</div>
             <div className="p-2 bg-gray-50 rounded">קופ קון קראפ/קה (תודה)</div>
             <div className="p-2 bg-gray-50 rounded">מאי פט (לא חריף)</div>
             <div className="p-2 bg-gray-50 rounded">ארוי (טעים)</div>
          </div>
        </div>
      </div>
    </div>
  );
};