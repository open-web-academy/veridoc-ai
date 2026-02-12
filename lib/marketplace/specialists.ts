/** Specialist verification status from the API. Only these two values are used. */
export type SpecialistStatus = "Verified" | "Under Review";

export type UiSpecialist = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  experience: number;
  languages: string[];
  tags: string[];
  priceUsdt: number;
  availability: string;
  image: string;
  location: string;
  /** Derived for display: true when status is Verified or Under Review */
  verified: boolean;
  /** Verification status: 'Verified' | 'Under Review' */
  status: SpecialistStatus | "";
  isMock?: boolean;
  /** URL to license/ID document (e.g. cédula profesional) */
  licenseDocumentUrl?: string;
  /** URL to degree/title document (e.g. título) */
  degreeDocumentUrl?: string;
  biography?: string;
  nearAddress?: string;
  professionalTitle?: string;
  yearsOfExperience?: number;
  consultationPrice?: number;
  privyWallet?: string;
  profileImageUrl?: string;
};

/** Shape of one specialist from the external verification API (GET /api/specialists) */
type ApiSpecialist = {
  _id?: string;
  professionalTitle?: string;
  specialty?: string;
  profileImageUrl?: string;
  yearsOfExperience?: number;
  consultationPrice?: number;
  languages?: string[];
  status?: string;
  privyWallet?: string;
  licenseDocumentUrl?: string;
  degreeDocumentUrl?: string;
  biography?: string;
  nearAddress?: string;
  [key: string]: unknown;
};

function normalizeStatus(status: string | undefined): UiSpecialist["status"] {
  if (!status) return "";
  const s = status.trim();
  if (s === "Verified" || s === "Under Review") return s;
  if (s === "Verificado") return "Verified";
  return "";
}

function mapApiSpecialistToUi(item: ApiSpecialist): UiSpecialist {
  const id = String(item._id ?? item.privyWallet ?? "");
  const status = normalizeStatus(item.status);
  return {
    id,
    name: item.professionalTitle ?? "Specialist",
    specialty: item.specialty ?? "Blood panel review",
    rating: 5,
    reviews: 0,
    experience: item.yearsOfExperience ?? 0,
    languages: Array.isArray(item.languages) ? item.languages : [],
    tags: [],
    priceUsdt: item.consultationPrice ?? 0,
    availability: "Consultar",
    image: item.profileImageUrl || `https://static.vecteezy.com/system/resources/previews/048/926/084/non_2x/silver-membership-icon-default-avatar-profile-icon-membership-icon-social-media-user-image-illustration-vector.jpg`,
    location: "Online",
    verified: status === "Verified" || status === "Under Review",
    status,
    isMock: false,
    licenseDocumentUrl: item.licenseDocumentUrl,
    degreeDocumentUrl: item.degreeDocumentUrl,
    biography: item.biography,
    nearAddress: item.nearAddress,
    professionalTitle: item.professionalTitle,
    yearsOfExperience: item.yearsOfExperience,
    consultationPrice: item.consultationPrice,
    privyWallet: item.privyWallet,
    profileImageUrl: item.profileImageUrl,
  };
}

/** Fetches specialists from the external verification API (GET /api/specialists). */
export async function getSpecialistsFromApi(): Promise<UiSpecialist[]> {
  const baseUrl = process.env.SPECIALIST_VERIFICATION_API_URL;
  if (!baseUrl) {
    console.warn("SPECIALIST_VERIFICATION_API_URL not set, marketplace will be empty.");
    return [];
  }
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/specialists`;
    const res = await fetch(url, { cache: "no-store" });
    const raw = await res.json().catch(() => null);
    if (!res.ok) return [];
    const list = Array.isArray(raw) ? raw : raw?.data;
    if (!Array.isArray(list)) return [];
    return list.map((item: ApiSpecialist) => mapApiSpecialistToUi(item));
  } catch (e) {
    console.warn("Marketplace: failed to fetch specialists from API.", e);
    return [];
  }
}

/** Fetches one specialist by id from the external API (GET /api/specialists/:id). */
export async function getSpecialistByIdFromApi(id: string): Promise<UiSpecialist | null> {
  const baseUrl = process.env.SPECIALIST_VERIFICATION_API_URL;
  if (!baseUrl) return null;
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/specialists/${encodeURIComponent(id)}`;
    const res = await fetch(url, { cache: "no-store" });
    const raw = await res.json().catch(() => null);
    if (!res.ok) return null;
    const item = raw?.data ?? raw;
    if (!item || typeof item !== "object") return null;
    return mapApiSpecialistToUi(item as ApiSpecialist);
  } catch (e) {
    console.warn("Marketplace: failed to fetch specialist by id from API.", e);
    return null;
  }
}

/** Fetches one specialist by identifier from the external API (GET /api/specialists/identifier/:identifier). */
export async function getSpecialistByIdentifierFromApi(identifier: string): Promise<UiSpecialist | null> {
  const baseUrl = process.env.SPECIALIST_VERIFICATION_API_URL;
  if (!baseUrl) return null;
  try {
    const url = `${baseUrl.replace(/\/$/, "")}/api/specialists/identifier/${encodeURIComponent(identifier)}`;
    const res = await fetch(url, { cache: "no-store" });
    const raw = await res.json().catch(() => null);
    if (!res.ok) return null;
    const item = raw?.data ?? raw;
    if (!item || typeof item !== "object") return null;
    return mapApiSpecialistToUi(item as ApiSpecialist);
  } catch (e) {
    console.warn("Marketplace: failed to fetch specialist by identifier from API.", e);
    return null;
  }
}

/** Fetches one specialist by id (alias for getSpecialistByIdFromApi). */
export async function getSpecialistById(id: string): Promise<UiSpecialist | null> {
  return getSpecialistByIdFromApi(id);
}
