import React from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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
      const styles = StyleSheet.create({
        page: {
          fontFamily: 'Helvetica',
          fontSize: 12,
          paddingTop: 30,
          paddingLeft: 60,
          paddingRight: 60,
          paddingBottom: 30,
        },
        header: {
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'center',
          marginBottom: 30,
          borderBottomWidth: 2,
          borderBottomColor: '#000',
          paddingBottom: 10,
        },
        customerInfo: {
          marginBottom: 20,
          backgroundColor: '#f5f5f5',
          padding: 15,
          borderRadius: 5,
        },
        partItem: {
          marginBottom: 20,
          padding: 15,
          border: '1px solid #ddd',
          borderRadius: 5,
        },
        partHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        },
        partTitle: {
          fontSize: 16,
          fontWeight: 'bold',
          color: '#2563eb',
        },
        partQuantity: {
          fontSize: 14,
          fontWeight: 'bold',
          backgroundColor: '#e5e7eb',
          padding: 5,
          borderRadius: 15,
        },
        measurementsContainer: {
          marginVertical: 10,
        },
        measurementRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 10,
        },
        measurement: {
          backgroundColor: '#f8fafc',
          padding: 8,
          borderRadius: 4,
          borderLeftWidth: 3,
          borderLeftColor: '#3b82f6',
          minWidth: 120,
          marginBottom: 5,
        },
        measurementLabel: {
          fontSize: 10,
          fontWeight: 'bold',
          color: '#374151',
        },
        measurementValue: {
          fontSize: 12,
          color: '#1f2937',
        },
        notes: {
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          padding: 10,
          borderRadius: 5,
          marginTop: 10,
        },
        notesTitle: {
          fontWeight: 'bold',
          color: '#92400e',
          fontSize: 12,
          marginBottom: 5,
        },
        notesContent: {
          color: '#78350f',
          fontSize: 11,
        },
        footer: {
          marginTop: 30,
          paddingTop: 20,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: 11,
        },
      });

      const PDFDocument = () => (
        <Document>
          <Page size="A4" style={styles.page}>
            <Text style={styles.header}>RECTANGULAR DUCT SİPARİŞİ</Text>
            
            <View style={styles.customerInfo}>
              <Text>Müşteri: {user.firstName} {user.lastName}</Text>
              <Text>E-posta: {user.email}</Text>
              <Text>Sipariş Tarihi: {new Date().toLocaleDateString('tr-TR')}</Text>
            </View>
            
            {orderList.map((part, index) => (
              <View key={index} style={styles.partItem}>
                <View style={styles.partHeader}>
                  <Text style={styles.partTitle}>{index + 1}. {part.name}</Text>
                  <Text style={styles.partQuantity}>Adet: {part.quantity}</Text>
                </View>
                
                {Object.keys(part.measurements).length > 0 && (
                  <View style={styles.measurementsContainer}>
                    <View style={styles.measurementRow}>
                      {Object.entries(part.measurements).map(([key, value]) => (
                        <View key={key} style={styles.measurement}>
                          <Text style={styles.measurementLabel}>{formatMeasurementLabel(key)}</Text>
                          <Text style={styles.measurementValue}>{value} mm</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {part.notes && (
                  <View style={styles.notes}>
                    <Text style={styles.notesTitle}>Notlar:</Text>
                    <Text style={styles.notesContent}>{part.notes}</Text>
                  </View>
                )}
              </View>
            ))}
            
            <View style={styles.footer}>
              <Text>Toplam Parça Sayısı: {orderList.length} | Toplam Adet: {orderList.reduce((sum, part) => sum + part.quantity, 0)}</Text>
              <Text>Bu sipariş {new Date().toLocaleDateString('tr-TR')} tarihinde oluşturulmuştur.</Text>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          {orderList.length > 0 && (
            <span style={{ 
              fontSize: '0.8em', 
              background: 'rgba(250, 112, 154, 0.1)', 
              color: '#fa709a',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: 'normal',
              textAlign: 'center'
            }}>
              {orderList.length} parça, {orderList.reduce((sum, part) => sum + part.quantity, 0)} adet
            </span>
          )}
          <button
            onClick={generatePDF}
            disabled={loading || orderList.length === 0}
            className={`custom-btn pdf-btn ${loading || orderList.length === 0 ? 'loading' : ''}`}
            style={{ fontSize: '12px', padding: '8px 12px' }}
          >
            {loading ? '📄 PDF...' : '📄 PDF İndir'}
          </button>
        </div>
      </div>

      {orderList.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px 24px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '12px',
          border: '1px solid #e3e8ed'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📋</div>
          <p style={{ fontSize: '1.2em', fontWeight: '600', color: '#495057', marginBottom: '8px' }}>
            Henüz sipariş eklenmemiş
          </p>
          <p style={{ fontSize: '0.9em', color: '#6c757d' }}>
            Sol panelden parça seçerek sipariş oluşturmaya başlayın
          </p>
        </div>
      ) : (
        <div id="order-cards" className="custom-scrollbar" style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {orderList.map((part, index) => (
            <div key={part.id} className="order-card slide-in">
              <div className="order-img">
                <img 
                  src={`http://localhost:5050/${part.image}`} 
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
                  <div style={{ fontWeight: 'bold', marginBottom: '12px', color: '#495057' }}>
                    📏 Ölçüler:
                  </div>
                  {Object.entries(part.measurements).filter(([key, value]) => value !== undefined && value !== '').map(([key, value]) => (
                    <div key={key}>
                      <span className="measurement-label">{formatMeasurementLabel(key)}:</span>
                      <span className="measurement-value">{value} mm</span>
                    </div>
                  ))}
                  {part.directions && Object.entries(part.directions).filter(([key, value]) => value > 0).map(([key, value]) => (
                    <div key={key}>
                      <span className="measurement-label">{key.replace('_', ' ').toUpperCase()}:</span>
                      <span className="measurement-value">{value} adet</span>
                    </div>
                  ))}
                  
                  {Object.keys(part.checkboxes).filter(key => part.checkboxes[key]).length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#495057' }}>
                        ⚙️ Seçenekler:
                      </div>
                      {Object.entries(part.checkboxes).filter(([key, value]) => value).map(([key, value]) => (
                        <div key={key} style={{ color: '#28a745', marginBottom: '4px' }}>
                          ✓ {formatCheckboxLabel(key)}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ marginTop: '16px' }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #ff6b6b 0%, #ffa726 100%)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.9em'
                    }}>
                      📦 Adet: {part.quantity}
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: '16px' }}>
                <button
                  onClick={() => onRemovePart(part.id)}
                  className="custom-btn remove-btn"
                  style={{ fontSize: '14px', padding: '8px 16px' }}
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