'use client'

import { useState } from 'react'
import AdCard from './AdCard'
import SearchHistory from './SearchHistory'
import SkeletonAdCard from './SkeletonAdCard'

export default function SearchAds() {
    const [keyword, setKeyword] = useState('')
    const [country, setCountry] = useState('US')
    const [maxResults, setMaxResults] = useState(10)
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState<any[]>([])
    const [error, setError] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [searchCount, setSearchCount] = useState(0)
    const ITEMS_PER_PAGE = 12

    const executeSearch = async (searchKeyword: string, searchCountry: string, searchMax: number) => {
        if (loading) return

        console.log(`Executing search for: ${searchKeyword} in ${searchCountry}`)

        setLoading(true)
        setError('')
        setResults([])
        setCurrentPage(1)

        // Update form state to reflect what's being searched
        setKeyword(searchKeyword)
        setCountry(searchCountry)
        setMaxResults(searchMax)

        try {
            const res = await fetch('/api/ads/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ keyword: searchKeyword, country: searchCountry, maxResults: searchMax }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch ads')
            }

            setResults(data)
            setSearchCount(prev => prev + 1)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleHistorySelect = (k: string, c: string, m: number) => {
        executeSearch(k, c, m)
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        executeSearch(keyword, country, maxResults)
    }

    // Pagination Logic
    const indexOfLastItem = currentPage * ITEMS_PER_PAGE
    const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE
    const currentResults = results.slice(indexOfFirstItem, indexOfLastItem)
    const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE)

    const handlePageChange = (page: number) => {
        setCurrentPage(page)
        // Optional: Scroll to top of grid
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <div className="space-y-8">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                    <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search Ads
                </h2>

                <SearchHistory onSelect={handleHistorySelect} refreshTrigger={searchCount} />

                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1">Keyword / Page Name</label>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="e.g. Nike, Marketing, Drop Shipping"
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Country Code</label>
                        <select
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value="US">United States (US)</option>
                            <option value="CA">Canada (CA)</option>
                            <option value="GB">United Kingdom (GB)</option>
                            <option value="AU">Australia (AU)</option>
                            <option value="ALL">All Countries</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Max Results</label>
                        <select
                            value={maxResults}
                            onChange={(e) => setMaxResults(Number(e.target.value))}
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                        >
                            <option value={10}>10 Results</option>
                            <option value={20}>20 Results</option>
                            <option value={50}>50 Results</option>
                            <option value={100}>100 Results</option>
                        </select>
                    </div>

                    <div className="md:col-span-4 flex justify-end mt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Searching...
                                </>
                            ) : (
                                <>
                                    Search Ads
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Results Grid */}
            <div>
                {loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                                <SkeletonAdCard />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            Search Results
                            <span className="bg-zinc-800 text-zinc-400 text-xs py-1 px-2 rounded-full border border-zinc-700">
                                {results.length} found
                            </span>
                        </h3>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {currentResults.map((ad, index) => (
                        <div key={ad.id || index} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <AdCard ad={ad} />
                        </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center mt-12 gap-4">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-lg bg-zinc-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors border border-zinc-700"
                        >
                            Previous
                        </button>
                        <span className="text-zinc-400 text-sm font-medium">
                            Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span>
                        </span>
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-lg bg-zinc-800 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors border border-zinc-700"
                        >
                            Next
                        </button>
                    </div>
                )}

                {!loading && results.length === 0 && !error && (
                    <div className="text-center py-20 text-zinc-500">
                        <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <p>Enter a keyword to start searching for ads.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
