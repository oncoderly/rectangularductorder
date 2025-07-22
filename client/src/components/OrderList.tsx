import React from 'react';
import { pdf, Document, Page, Text, View, Image } from '@react-pdf/renderer';
import { parts } from '../data/parts';
import { pdfStyles } from '../styles/pdfStyles';
import '../styles/OrderList.css';

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

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface OrderListProps {
  orderList: SelectedPart[];
  user: User;
  onRemovePart: (partId: string) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orderList, user, onRemovePart }) => {
  const [loading, setLoading] = React.useState(false);

  const generatePDF = async () => {
    if (orderList.length === 0) {
      alert('Sipariş listesi boş!');
      return;
    }

    setLoading(true);
    try {

      const PDFDocument = () => (
        <Document>
          <Page size="A4" style={pdfStyles.page}>
            <Text style={pdfStyles.header}>RECTANGULAR DUCT SİPARİŞİ</Text>
            
            <View style={pdfStyles.customerInfo}>
              <Text style={pdfStyles.customerTitle}>📋 Müşteri Bilgileri</Text>
              <Text style={pdfStyles.customerText}>Müşteri: {user.firstName} {user.lastName}</Text>
              <Text style={pdfStyles.customerText}>E-posta: {user.email}</Text>
              <Text style={pdfStyles.customerText}>Sipariş Tarihi: {new Date().toLocaleDateString('tr-TR')}</Text>
            </View>
            
            {orderList.map((part, index) => (
              <View key={index} style={pdfStyles.partItem}>
                <Image 
                  style={pdfStyles.partImage}
                  src={`${window.location.origin}/${part.image}`}
                />
                
                <View style={pdfStyles.partContent}>
                  <View style={pdfStyles.partHeader}>
                    <Text style={pdfStyles.partTitle}>#{index + 1} - {part.name}</Text>
                    <Text style={pdfStyles.partQuantity}>📦 Adet: {part.quantity}</Text>
                  </View>
                  
                  {(() => {
                    const selectedPart = parts[part.partKey];
                    if (!selectedPart) return null;
                    
                    return (
                      <View style={pdfStyles.measurementsContainer}>
                        <Text style={pdfStyles.measurementsTitle}>📏 Ölçüler:</Text>
                        <View style={pdfStyles.measurementRow}>
                          {selectedPart.measurements.map((measurement) => {
                            if (measurement.directions) {
                              return measurement.directions.map((direction) => {
                                const directionKey = `${measurement.key}_${direction.key}`;
                                const value = part.directions?.[directionKey] || 0;
                                return (
                                  <View key={directionKey} style={pdfStyles.measurement}>
                                    <Text style={pdfStyles.measurementLabel}>{direction.label}:</Text>
                                    <Text style={pdfStyles.measurementValue}>{value} adet</Text>
                                  </View>
                                );
                              });
                            } else {
                              const value = part.measurements[measurement.key] || 0;
                              return (
                                <View key={measurement.key} style={pdfStyles.measurement}>
                                  <Text style={pdfStyles.measurementLabel}>{measurement.label}:</Text>
                                  <Text style={pdfStyles.measurementValue}>{value} cm</Text>
                                </View>
                              );
                            }
                          })}
                        </View>
                      </View>
                    );
                  })()}

                  {(() => {
                    const selectedPart = parts[part.partKey];
                    if (!selectedPart || selectedPart.checkboxes.length === 0) return null;
                    
                    return (
                      <View style={pdfStyles.optionsContainer}>
                        <Text style={pdfStyles.optionsTitle}>⚙️ Seçenekler:</Text>
                        {selectedPart.checkboxes.map((checkbox) => {
                          const isChecked = part.checkboxes[checkbox.key] || false;
                          return (
                            <Text key={checkbox.key} style={pdfStyles.option}>
                              {isChecked ? '✓' : '☐'} {checkbox.label}
                            </Text>
                          );
                        })}
                      </View>
                    );
                  })()}
                  
                  {part.notes && (
                    <View style={pdfStyles.notes}>
                      <Text style={pdfStyles.notesTitle}>Notlar:</Text>
                      <Text style={pdfStyles.notesContent}>{part.notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
            
            <View style={pdfStyles.footer}>
              <Text style={pdfStyles.footerStats}>Toplam Parça Sayısı: {orderList.length} | Toplam Adet: {orderList.reduce((sum, part) => sum + part.quantity, 0)}</Text>
              <Text style={pdfStyles.footerDate}>Bu sipariş {new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</Text>
            </View>
          </Page>
        </Document>
      );

      const pdfBlob = await pdf(<PDFDocument />).toBlob();
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `siparis_${new Date().toISOString().split('T')[0]}_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatMeasurementLabel = (key: string): string => {
    const labelMap: { [key: string]: string } = {
      w1: 'Genişlik 1', w2: 'Genişlik 2', w3: 'Genişlik 3',
      h1: 'Yükseklik 1', h2: 'Yükseklik 2', h3: 'Yükseklik 3',
      l: 'Uzunluk', r1: 'Yarıçap 1', r2: 'Yarıçap 2',
      a1: 'Açı 1', a2: 'Açı 2', o: 'Çap', es: 'ES'
    };
    return labelMap[key] || key.toUpperCase();
  };

  const formatCheckboxLabel = (key: string): string => {
    return key.replace(/_/g, ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="panel slide-in">
      <div className="panel-header">
        <div className="panel-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h2 className="panel-title">
          Sipariş Listesi
        </h2>
        <div className="panel-header-stats">
          {orderList.length > 0 && (
            <span className="order-stats-badge">
              {orderList.length} parça, {orderList.reduce((sum, part) => sum + part.quantity, 0)} adet
            </span>
          )}
          <button
            onClick={generatePDF}
            disabled={loading || orderList.length === 0}
            className={`custom-btn pdf-btn pdf-button ${loading || orderList.length === 0 ? 'loading' : ''}`}
          >
            {loading ? '📄 PDF...' : '📄 PDF İndir'}
          </button>
        </div>
      </div>

      {orderList.length === 0 ? (
        <div className="empty-order-container">
          <div className="empty-order-icon">📋</div>
          <p className="empty-order-title">
            Henüz sipariş eklenmemiş
          </p>
          <p className="empty-order-subtitle">
            Sol panelden parça seçerek sipariş oluşturmaya başlayın
          </p>
        </div>
      ) : (
        <div id="order-cards" className="custom-scrollbar order-cards-container">
          {orderList.map((part, index) => (
            <div key={part.id} className="order-card slide-in">
              <div className="order-img">
                <img 
                  src={`/${part.image}`} 
                  alt={part.name}
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMSAyMUg0M1Y0M0gyMVYyMVoiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=';
                  }}
                />
              </div>
              
              <div className="order-details">
                <div className="order-part">
                  #{index + 1} - {part.name}
                </div>
                
                <div className="order-measurements">
                  <div className="measurements-section-title">
                    📏 Ölçüler:
                  </div>
                  {Object.entries(part.measurements).map(([key, value]) => (
                    <div key={key}>
                      <span className="measurement-label">{formatMeasurementLabel(key)}:</span>
                      <span className="measurement-value">{value} cm</span>
                    </div>
                  ))}
                  {part.directions && Object.entries(part.directions).filter(([, value]) => value > 0).map(([key, value]) => (
                    <div key={key}>
                      <span className="measurement-label">{key.replace('_', ' ').toUpperCase()}:</span>
                      <span className="measurement-value">{value} adet</span>
                    </div>
                  ))}
                  
                  {Object.keys(part.checkboxes).filter(key => part.checkboxes[key]).length > 0 && (
                    <div className="options-section">
                      <div className="options-title">
                        ⚙️ Seçenekler:
                      </div>
                      {Object.entries(part.checkboxes).filter(([, value]) => value).map(([key]) => (
                        <div key={key} className="option-item">
                          ✓ {formatCheckboxLabel(key)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div>
                    <span className="quantity-badge">
                      📦 Adet: {part.quantity}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="remove-button-container">
                <button
                  onClick={() => onRemovePart(part.id)}
                  className="custom-btn remove-btn remove-button"
                >
                  🗑️ Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderList;