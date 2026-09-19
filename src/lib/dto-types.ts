export interface PrismaUser {
  id: string
  email: string
  name: string
  role: string
  avatar: string | null
  coverImage: string | null
  headline: string | null
  bio: string | null
  city: string | null
  country: string | null
  gender: string | null
  qualification: string | null
  subjects: string | null
  languages: string | null
  feeMin: number | null
  feeMax: number | null
  coins: number
  money: number
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}
