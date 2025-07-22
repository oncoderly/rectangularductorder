import React from 'react';
import { pdf, Document, Page, Text, View, Image, Font } from '@react-pdf/renderer';
import { parts } from '../data/parts';
import { pdfStyles } from '../styles/pdfStyles';
import '../styles/OrderList.css';

// Türkçe karakter desteği için font kaydı
Font.register({
  family: 'Roboto',
  fonts: [
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
      fontWeight: 'normal'
    },
    {
      src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf',
      fontWeight: 'bold'
    }
  ]
});

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
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [pdfBlob, setPdfBlob] = React.useState<Blob | null>(null);

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
            <Text style={pdfStyles.header}>HAVA KANALI SİPARİŞ LİSTESİ</Text>
            
            <View style={pdfStyles.customerInfo}>
              <Text style={pdfStyles.customerTitle}>Müşteri Bilgileri</Text>
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
                    <Text style={pdfStyles.partQuantity}>Adet: {part.quantity}</Text>
                  </View>
                  
                  {(() => {
                    const selectedPart = parts[part.partKey];
                    if (!selectedPart) return null;
                    
                    return (
                      <View style={pdfStyles.measurementsContainer}>
                        <Text style={pdfStyles.measurementsTitle}>Ölçüler</Text>
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
                                  <Text style={pdfStyles.measurementValue}>{value} {(measurement.label.includes('Açı') || measurement.key === 'a1' || measurement.key === 'a2') ? '°' : 'cm'}</Text>
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
                        <Text style={pdfStyles.optionsTitle}>Seçenekler:</Text>
                        {selectedPart.checkboxes.filter((checkbox) => part.checkboxes[checkbox.key] || false).map((checkbox) => {
                          return (
                            <Text key={checkbox.key} style={pdfStyles.option}>
                              ✓ {checkbox.label}
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

      const generatedPdfBlob = await pdf(<PDFDocument />).toBlob();
      const url = URL.createObjectURL(generatedPdfBlob);
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

  const generatePDFForShare = async () => {
    if (orderList.length === 0) {
      alert('Sipariş listesi boş!');
      return;
    }

    setLoading(true);
    try {
      const PDFDocument = () => (
        <Document>
          <Page size="A4" style={pdfStyles.page}>
            <Text style={pdfStyles.header}>HAVA KANALI SİPARİŞ LİSTESİ</Text>
            
            <View style={pdfStyles.customerInfo}>
              <Text style={pdfStyles.customerTitle}>Müşteri Bilgileri</Text>
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
                    <Text style={pdfStyles.partQuantity}>Adet: {part.quantity}</Text>
                  </View>
                  
                  {(() => {
                    const selectedPart = parts[part.partKey];
                    if (!selectedPart) return null;
                    
                    return (
                      <View style={pdfStyles.measurementsContainer}>
                        <Text style={pdfStyles.measurementsTitle}>Ölçüler</Text>
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
                                  <Text style={pdfStyles.measurementValue}>{value} {(measurement.label.includes('Açı') || measurement.key === 'a1' || measurement.key === 'a2') ? '°' : 'cm'}</Text>
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
                        <Text style={pdfStyles.optionsTitle}>Seçenekler:</Text>
                        {selectedPart.checkboxes.filter((checkbox) => part.checkboxes[checkbox.key] || false).map((checkbox) => {
                          return (
                            <Text key={checkbox.key} style={pdfStyles.option}>
                              ✓ {checkbox.label}
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

      const generatedPdfBlob = await pdf(<PDFDocument />).toBlob();
      setPdfBlob(generatedPdfBlob);
      setShowShareModal(true);

    } catch (error: any) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const shareViaWhatsApp = () => {
    if (!pdfBlob) return;

    const fileName = `siparis_${new Date().toISOString().split('T')[0]}_${Date.now()}.pdf`;
    const message = `🛒 Hava Kanalı Sipariş Listesi\n\n📋 Toplam ${orderList.length} parça, ${orderList.reduce((sum, part) => sum + part.quantity, 0)} adet\n👤 Müşteri: ${user.firstName} ${user.lastName}\n📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}\n\nPDF dosyası ektedir.`;
    
    // Mobil cihazlarda doğrudan WhatsApp uygulamasını aç
    if (navigator.share) {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      navigator.share({
        title: 'Hava Kanalı Sipariş Listesi',
        text: message,
        files: [file]
      }).catch(console.error);
    } else {
      // Web share desteklenmiyorsa WhatsApp Web'e yönlendir
      const encodedMessage = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    }
    
    setShowShareModal(false);
  };

  const shareViaEmail = () => {
    if (!pdfBlob) return;

    const subject = encodeURIComponent('Hava Kanalı Sipariş Listesi');
    const body = encodeURIComponent(`Merhaba,

🛒 Hava Kanalı Sipariş Listesi

📋 Toplam Parça Sayısı: ${orderList.length}
📦 Toplam Adet: ${orderList.reduce((sum, part) => sum + part.quantity, 0)}
👤 Müşteri: ${user.firstName} ${user.lastName}
📧 E-posta: ${user.email}
📅 Sipariş Tarihi: ${new Date().toLocaleDateString('tr-TR')}

PDF dosyası ekte yer almaktadır.

İyi günler dileriz.`);

    // PDF'i geçici olarak indir, kullanıcı manuel ekleme yapabilir
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `siparis_${new Date().toISOString().split('T')[0]}_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // E-posta uygulamasını aç
    setTimeout(() => {
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }, 500);
    
    setShowShareModal(false);
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
          <button
            onClick={generatePDFForShare}
            disabled={loading || orderList.length === 0}
            className={`custom-btn share-btn ${loading || orderList.length === 0 ? 'loading' : ''}`}
            style={{ 
              background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
              marginLeft: '8px',
              fontSize: '14px'
            }}
          >
            {loading ? '📤 Hazırlanıyor...' : '📤 Paylaş'}
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
                  {(() => {
                    const selectedPart = parts[part.partKey];
                    if (!selectedPart) return null;
                    
                    return selectedPart.measurements.map((measurement) => {
                      if (measurement.directions) {
                        return measurement.directions.map((direction) => {
                          const directionKey = `${measurement.key}_${direction.key}`;
                          const value = part.directions?.[directionKey] || 0;
                          return (
                            <div key={directionKey}>
                              <span className="measurement-label">{direction.label}:</span>
                              <span className="measurement-value">{value} adet</span>
                            </div>
                          );
                        });
                      } else {
                        const value = part.measurements[measurement.key] || 0;
                        return (
                          <div key={measurement.key}>
                            <span className="measurement-label">{measurement.label}:</span>
                            <span className="measurement-value">{value} {(measurement.label.includes('Açı') || measurement.key === 'a1' || measurement.key === 'a2') ? '°' : 'cm'}</span>
                          </div>
                        );
                      }
                    }).flat();
                  })()}
                  
                  {Object.keys(part.checkboxes).filter(key => part.checkboxes[key]).length > 0 && (
                    <div className="options-section">
                      <div className="options-title">
                        Secenekler:
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

      {/* Paylaşım Modal */}
      {showShareModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div 
            style={{
              background: 'white',
              padding: '32px',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxWidth: '400px',
              width: '90%',
              animation: 'slideIn 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#2c3e50',
                marginBottom: '8px'
              }}>
                📤 PDF Paylaş
              </h3>
              <p style={{ 
                color: '#7f8c8d', 
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                Sipariş listenizi WhatsApp veya e-posta ile paylaşın
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={shareViaWhatsApp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                💬 WhatsApp ile Paylaş
              </button>

              <button
                onClick={shareViaEmail}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  padding: '16px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  width: '100%'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                📧 E-posta ile Paylaş
              </button>

              <button
                onClick={() => setShowShareModal(false)}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: '#7f8c8d',
                  border: '2px solid #ecf0f1',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#bdc3c7';
                  e.currentTarget.style.color = '#2c3e50';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#ecf0f1';
                  e.currentTarget.style.color = '#7f8c8d';
                }}
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;