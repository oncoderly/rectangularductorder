import { useState, useEffect } from 'react'
import { supabase } from '../supabase/config'
import { PostgrestError } from '@supabase/supabase-js'

interface UseSupabaseDataOptions {
  table: string
  select?: string
  filters?: Record<string, any>
  orderBy?: { column: string; ascending?: boolean }
  limit?: number
  realtime?: boolean
}

interface UseSupabaseDataReturn<T> {
  data: T[] | null
  loading: boolean
  error: PostgrestError | null
  refresh: () => Promise<void>
  insert: (data: Partial<T>) => Promise<{ data: T[] | null; error: PostgrestError | null }>
  update: (id: string, data: Partial<T>) => Promise<{ data: T[] | null; error: PostgrestError | null }>
  delete: (id: string) => Promise<{ error: PostgrestError | null }>
}

export function useSupabaseData<T = any>(
  options: UseSupabaseDataOptions
): UseSupabaseDataReturn<T> {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<PostgrestError | null>(null)

  const { table, select = '*', filters, orderBy, limit, realtime = false } = options

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    let query = supabase
      .from(table)
      .select(select)

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
    }

    // Apply limit
    if (limit) {
      query = query.limit(limit)
    }

    const { data: fetchedData, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError)
      console.error('Error fetching data:', fetchError)
    } else {
      setData(fetchedData)
    }

    setLoading(false)
  }

  const refresh = async () => {
    await fetchData()
  }

  const insert = async (insertData: Partial<T>) => {
    const { data: insertedData, error: insertError } = await supabase
      .from(table)
      .insert(insertData)
      .select()

    if (!insertError) {
      await refresh() // Refresh data after insert
    }

    return { data: insertedData, error: insertError }
  }

  const update = async (id: string, updateData: Partial<T>) => {
    const { data: updatedData, error: updateError } = await supabase
      .from(table)
      .update(updateData)
      .eq('id', id)
      .select()

    if (!updateError) {
      await refresh() // Refresh data after update
    }

    return { data: updatedData, error: updateError }
  }

  const deleteRecord = async (id: string) => {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .eq('id', id)

    if (!deleteError) {
      await refresh() // Refresh data after delete
    }

    return { error: deleteError }
  }

  useEffect(() => {
    fetchData()
  }, [table, JSON.stringify(filters), JSON.stringify(orderBy), limit])

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return

    const subscription = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table },
          (payload) => {
            console.log('Real-time change:', payload)
            refresh()
          })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [table, realtime])

  return {
    data,
    loading,
    error,
    refresh,
    insert,
    update,
    delete: deleteRecord
  }
}