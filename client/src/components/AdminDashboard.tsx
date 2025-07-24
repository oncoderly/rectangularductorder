import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (window.location.origin);

  totalUsers: number;
  totalSessions: number;
  id: string;
  totalActivities: number;
  pdfDownloads: number;
  buttonClicks: number;
}

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/analytics`, {
        withCredentials: true
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
  };

  if (loading) {
    return (
      </div>
    );
  }

  if (error) {
    return (
      </div>
    );
  }

  return (

        {/* Summary Cards */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              </div>
            </div>
          </div>
        </div>

            <div className="px-6 py-4 border-b border-gray-200">
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>

            <div className="px-6 py-4 border-b border-gray-200">
            </div>
                    <div className="flex items-center justify-between">
                      </div>
                      <div>
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;