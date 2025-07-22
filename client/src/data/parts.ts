interface Measurement {
  key: string;
  label: string;
  default?: number;
  directions?: Direction[];
}

interface Direction {
  key: string;
  label: string;
}

interface Checkbox {
  key: string;
  label: string;
}

export interface PartDefinition {
  name: string;
  image: string;
  measurements: Measurement[];
  checkboxes: Checkbox[];
}

export interface PartData {
  [key: string]: PartDefinition;
}

export const parts: PartData = {
    "1-duz-kanal.png": {
        name: "Düz Kanal",
        image: "images/1-duz-kanal.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l",  label: "L", default: 120 }
        ],
        checkboxes: []
    },
    "2-dirsek.png": {
        name: "Dirsek",
        image: "images/2-dirsek.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "r1", label: "R1", default: 15 },
            { key: "a1", label: "A (Açı)", default: 90 }
        ],
        checkboxes: []
    },
    "2-reduksiyonlu-dirsek.png": {
        name: "Redüksiyonlu Dirsek",
        image: "images/2-redüksiyonlu dirsek.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "w2", label: "W2" },
            { key: "h2", label: "H2" },
            { key: "r1", label: "R1", default: 15 },
            { key: "a1", label: "A (Açı)", default: 90 }
        ],
        checkboxes: [
            { key: "sol_duz", label: "Sol Düz" },
            { key: "sag_duz", label: "Sağ Düz" }
        ]
    },
    "3-reduksiyon.png": {
        name: "Redüksiyon",
        image: "images/3-reduksiyon.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l",  label: "L", default: 40 },
            { key: "w2", label: "W2" },
            { key: "h2", label: "H2" }
        ],
        checkboxes: [
            { key: "sol_duz", label: "Sol Düz" },
            { key: "sag_duz", label: "Sağ Düz" },
            { key: "alt_duz", label: "Alt Düz" },
            { key: "ust_duz", label: "Üst Düz" }
        ]
    },
    "4-pantolon-tip1.png": {
        name: "Pantolon Tip 1",
        image: "images/4-pantolon tip1.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l", label: "L", default: 40 },
            { key: "h2", label: "H2" },
            { key: "w2", label: "W2" },
            { key: "w3", label: "W3" },
            { key: "h3", label: "H3" },
            { key: "r1", label: "R1", default: 15 },
            { key: "a1", label: "A (Açı)", default: 90 }
        ],
        checkboxes: [
            { key: "alt_duz", label: "Alt Düz" },
            { key: "ust_duz", label: "Üst Düz" }
        ]
    },
    "5-saplama-yaka.png": {
        name: "Saplama (Yaka)",
        image: "images/5-SAPLAMA  ( YAKA ).png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l", label: "L", default: 10 },
            { key: "w2", label: "W2" }
        ],
        checkboxes: []
    },
    "kanal-kapagi-kor-tapa.png": {
        name: "Kanal Kapağı (Kör Tapa)",
        image: "images/KANAL KAPAĞI (kör tapa).png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" }
        ],
        checkboxes: []
    },
    "reduksiyon-dikdortgenden-yuvarlaga.png": {
        name: "Redüksiyon (Dikdörtgenden Yuvarlağa)",
        image: "images/REDÜKSİYON ( DİKDÖRTGENDEN YUVARLAĞA ).png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l", label: "L", default: 40 },
            { key: "o", label: "Ø" }
        ],
        checkboxes: []
    },
    "s-parcasi.png": {
        name: "S Parçası",
        image: "images/S PARÇASI.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l", label: "L", default: 100 },
            { key: "w2", label: "W2" },
            { key: "h2", label: "H2" },
            { key: "es", label: "ES" }
        ],
        checkboxes: []
    },
    "y-parcasi.png": {
        name: "Y Parçası",
        image: "images/Y PARÇASI.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "h2", label: "H2" },
            { key: "w2", label: "W2" },
            { key: "w3", label: "W3" },
            { key: "h3", label: "H3" },
            { key: "r1", label: "R1", default: 15 },
            { key: "a1", label: "A1 (Açı)", default: 90 },
            { key: "r2", label: "R2", default: 15 },
            { key: "a2", label: "A2 (Açı)", default: 90 }
        ],
        checkboxes: [
            { key: "alt1_duz", label: "Alt-1 Düz" },
            { key: "ust1_duz", label: "Üst-1 Düz" },
            { key: "ortali1", label: "Ortali-1" },
            { key: "alt2_duz", label: "Alt-2 Düz" },
            { key: "ust2_duz", label: "Üst-2 Düz" },
            { key: "ortali2", label: "Ortali-2" }
        ]
    },
    "lineer-menfez-kutusu.png": {
        name: "Lineer Menfez Kutusu",
        image: "images/LİNEER MENFEZ KUTUSU.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l", label: "L", default: 40 },
            {
                key: "o",
                label: "Ø",
                directions: [
                    { key: "sag", label: "Sağ" },
                    { key: "sol", label: "Sol" },
                    { key: "on",  label: "Ön" },
                    { key: "arka",label: "Arka" },
                    { key: "ust", label: "Üst" }
                ]
            }
        ],
        checkboxes: []
    },
    "fancoil-vrv-ic-unite-kutusu.png": {
        name: "Fancoil - VRV İç Ünite Kutusu",
        image: "images/FANCOIL - VRV İÇ ÜNİTE KUTUSU.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l", label: "L", default: 40 },
            { key: "o", label: "Ø" }
        ],
        checkboxes: []
    },
    "plenum-box-kutu.png": {
        name: "Plenum Box (Kutu)",
        image: "images/PLENUM BOX ( KUTU ).png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" },
            { key: "l", label: "L", default: 40 },
            {
                key: "o",
                label: "Ø MANŞON YÖNÜ VE ADETİ",
                directions: [
                    { key: "sag", label: "Sağ" },
                    { key: "sol", label: "Sol" },
                    { key: "on",  label: "Ön" },
                    { key: "arka",label: "Arka" },
                    { key: "ust", label: "Üst" }
                ]
            }
        ],
        checkboxes: []
    },
    "tel-kafes.png": {
        name: "Tel Kafes",
        image: "images/TEL KAFES.png",
        measurements: [
            { key: "w1", label: "W1" },
            { key: "h1", label: "H1" }
        ],
        checkboxes: []
    },
    "manson.png": {
        name: "Manşon",
        image: "images/MANŞON.png",
        measurements: [
            { key: "l", label: "L", default: 20 },
            { key: "o", label: "Ø" }
        ],
        checkboxes: []
    }
};