import { useState } from 'react';
import { parts } from '../data/parts';

interface PartMeasurement {
  [key: string]: number | string;
}

interface PartCheckbox {
  [key: string]: boolean;
}

interface SelectedPart {
  id: string;
  partKey: string;
  name: string;
  image: string;
  measurements: PartMeasurement;
  checkboxes: PartCheckbox;
  directions?: { [key: string]: number };
  quantity: number;
  notes?: string;
}

interface PartSelectorProps {
  onAddPart: (part: SelectedPart) => void;
}

const PartSelector: React.FC<PartSelectorProps> = ({ onAddPart }) => {
  const [selectedPartKey, setSelectedPartKey] = useState<string>('1-duz-kanal.png');
  const [measurements, setMeasurements] = useState<PartMeasurement>({});
  const [checkboxes, setCheckboxes] = useState<PartCheckbox>({});
  const [directions, setDirections] = useState<{ [key: string]: number }>({});
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  const selectedPart = selectedPartKey ? parts[selectedPartKey] : null;

  const handlePartSelect = (partKey: string) => {
    setSelectedPartKey(partKey);
    const part = parts[partKey];
    
    // Reset values
    const newMeasurements: PartMeasurement = {};
    part.measurements.forEach(m => {
      if (m.default !== undefined) {
        newMeasurements[m.key] = m.default;
      }
    });
    setMeasurements(newMeasurements);
    setCheckboxes({});
    setDirections({});
    setQuantity(1);
    setNotes('');
  };

  const handleMeasurementChange = (key: string, value: string) => {
    setMeasurements(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCheckboxChange = (key: string, checked: boolean) => {
    setCheckboxes(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const handleDirectionChange = (measurementKey: string, directionKey: string, value: number) => {
    setDirections(prev => ({
      ...prev,
      [`${measurementKey}_${directionKey}`]: value
    }));
  };

  const handleAddPart = () => {
    if (!selectedPart || !selectedPartKey) return;

    const newPart: SelectedPart = {
      id: `${selectedPartKey}_${Date.now()}`,
      partKey: selectedPartKey,
      name: selectedPart.name,
      image: selectedPart.image,
      measurements: { ...measurements },
      checkboxes: { ...checkboxes },
      directions: { ...directions },
      quantity,
      notes: notes.trim() || undefined
    };

    onAddPart(newPart);
    
    // Reset measurements and checkboxes but keep the same part selected
    setMeasurements({});
    setCheckboxes({});
    setDirections({});
    setQuantity(1);
    setNotes('');
  };

  return (
    <div className="panel slide-in">
      <div className="panel-header">
        <div className="panel-icon">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a4 4 0 004-4V5z" />
          </svg>
        </div>
        <h2 className="panel-title">Parça Seçimi</h2>
      </div>
      
      {/* Part Selection Dropdown */}
      <div className="form-row">
        <label>Parça Türü Seçin:</label>
        <select
          value={selectedPartKey}
          onChange={(e) => handlePartSelect(e.target.value)}
          className="custom-select focus-ring"
          style={{ width: '100%', maxWidth: '400px' }}
        >
          {Object.entries(parts).map(([partKey, part]) => (
            <option key={partKey} value={partKey}>
              {part.name}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Part Details */}
      {selectedPart && (
        <div style={{ marginTop: '24px' }}>
          <div className="image-panel">
            <img 
              src={`http://localhost:5050/${selectedPart.image}`} 
              alt={selectedPart.name}
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMSAyMUg0M1Y0M0gyMVYyMVoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=';
              }}
            />
          </div>
          
          <div className="panel-header" style={{ marginBottom: '16px' }}>
            <h3 className="panel-title" style={{ fontSize: '1.3em' }}>{selectedPart.name}</h3>
          </div>

          {/* Measurements */}
          <div className="form-panel">
            {selectedPart.measurements.map((measurement) => (
              <div key={measurement.key}>
                {measurement.directions ? (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ marginBottom: '12px', fontWeight: 'bold', color: '#34495e' }}>
                      {measurement.label}
                    </h4>
                    {measurement.directions.map((direction) => (
                      <div key={direction.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {/* Label */}
                        <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#34495e', minWidth: '60px', textAlign: 'right' }}>
                          {direction.label}:
                        </label>
                        
                        {/* Input */}
                        <div style={{ position: 'relative', minWidth: '60px' }}>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            className="focus-ring"
                            placeholder="0"
                            style={{ 
                              width: '60px',
                              textAlign: 'center',
                              fontSize: '11px',
                              padding: '4px',
                              borderRadius: '4px',
                              border: '1px solid #e3e8ed'
                            }}
                            value={directions[`${measurement.key}_${direction.key}`] || ''}
                            onChange={(e) => handleDirectionChange(
                              measurement.key, 
                              direction.key, 
                              Number(e.target.value) || 0
                            )}
                          />
                          <span style={{ 
                            fontSize: '10px',
                            color: '#6c757d',
                            marginLeft: '2px'
                          }}>adet</span>
                        </div>
                        
                        {/* -/+ Buttons */}
                        <button
                          type="button"
                          onClick={() => {
                            const currentValue = directions[`${measurement.key}_${direction.key}`] || 0;
                            const newValue = Math.max(0, currentValue - 1);
                            handleDirectionChange(measurement.key, direction.key, newValue);
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            background: '#ff6b6b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          −
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const currentValue = directions[`${measurement.key}_${direction.key}`] || 0;
                            const newValue = Math.min(50, currentValue + 1);
                            handleDirectionChange(measurement.key, direction.key, newValue);
                          }}
                          style={{
                            width: '24px',
                            height: '24px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          +
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    {/* Label */}
                    <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#34495e', minWidth: '40px', textAlign: 'right' }}>
                      {measurement.label}:
                    </label>
                    
                    {/* Slider */}
                    <div style={{ flex: '1', maxWidth: '100px' }}>
                      <input
                        type="range"
                        min="0"
                        max="200"
                        step="1"
                        value={measurements[measurement.key] || 0}
                        onChange={(e) => handleMeasurementChange(measurement.key, e.target.value)}
                        style={{
                          width: '100%',
                          height: '6px',
                          borderRadius: '3px',
                          background: '#e3e8ed',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    
                    {/* Value Display + Input */}
                    <div style={{ position: 'relative', minWidth: '60px' }}>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        step="1"
                        className="focus-ring"
                        placeholder="0"
                        style={{ 
                          width: '60px',
                          textAlign: 'center',
                          fontSize: '11px',
                          padding: '4px',
                          borderRadius: '4px',
                          border: '1px solid #e3e8ed'
                        }}
                        value={measurements[measurement.key] || ''}
                        onChange={(e) => {
                          const value = Math.min(200, Math.max(0, Number(e.target.value) || 0));
                          handleMeasurementChange(measurement.key, value.toString());
                        }}
                      />
                      <span style={{ 
                        fontSize: '10px',
                        color: '#6c757d',
                        marginLeft: '2px'
                      }}>cm</span>
                    </div>
                    
                    {/* -/+ Buttons */}
                    <button
                      type="button"
                      onClick={() => {
                        const currentValue = Number(measurements[measurement.key]) || 0;
                        const newValue = Math.max(0, currentValue - 5);
                        handleMeasurementChange(measurement.key, newValue.toString());
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      −
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const currentValue = Number(measurements[measurement.key]) || 0;
                        const newValue = Math.min(200, currentValue + 5);
                        handleMeasurementChange(measurement.key, newValue.toString());
                      }}
                      style={{
                        width: '24px',
                        height: '24px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              {/* Label */}
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#34495e', minWidth: '40px', textAlign: 'right' }}>
                Adet:
              </label>
              
              {/* Input */}
              <input
                type="number"
                min="1"
                max="100"
                className="focus-ring"
                style={{ 
                  width: '60px',
                  textAlign: 'center',
                  fontSize: '11px',
                  padding: '4px',
                  borderRadius: '4px',
                  border: '1px solid #e3e8ed'
                }}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              />
              
              {/* -/+ Buttons */}
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                style={{
                  width: '24px',
                  height: '24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: '#ff6b6b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                −
              </button>
              
              <button
                type="button"
                onClick={() => setQuantity(Math.min(100, quantity + 1))}
                style={{
                  width: '24px',
                  height: '24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Checkboxes */}
          {selectedPart.checkboxes.length > 0 && (
            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px', fontWeight: 'bold', color: '#34495e', fontSize: '1.2em' }}>
                Seçenekler:
              </h4>
              <div style={{ 
                background: 'rgba(255, 248, 240, 0.8)', 
                padding: '16px', 
                borderRadius: '12px', 
                border: '1px solid #e3e8ed' 
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {selectedPart.checkboxes.map((checkbox) => (
                    <label key={checkbox.key} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '8px',
                      transition: 'all 0.2s ease'
                    }} 
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <input
                        type="checkbox"
                        style={{ marginRight: '8px', width: '16px', height: '16px' }}
                        checked={checkboxes[checkbox.key] || false}
                        onChange={(e) => handleCheckboxChange(checkbox.key, e.target.checked)}
                      />
                      <span style={{ color: '#495057' }}>{checkbox.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginTop: '20px' }}>
            <div className="form-row">
              <label htmlFor="notes" style={{ fontSize: '32px' }}>📝 Notlar:</label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bu parça için özel notlarınızı yazın..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  fontSize: '28px',
                  border: '2px solid #e3e8ed',
                  borderRadius: '8px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <button
            onClick={handleAddPart}
            className="custom-btn add-btn"
            style={{ width: '100%', marginTop: '20px' }}
          >
            🛒 Siparişe Ekle
          </button>
        </div>
      )}
    </div>
  );
};

export default PartSelector;