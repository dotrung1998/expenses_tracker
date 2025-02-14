"use client"

import { useState, useEffect, useMemo } from "react"
import { toast, ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

type Currency = "EUR" | "USD" | "VND"

type Expense = {
  id: number
  amount: number
  currency: Currency
  category: string
  description: string
}

type ExchangeRates = {
  EUR: number
  USD: number
  VND: number
}

type CategorySum = {
  [key in Currency]: number
} & {
  VND: number
}

const categories = ["Eating in the restaurant", "Supermarket for food", "Groceries", "Furniture", "Other"]

const currencySymbols: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  VND: "₫",
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState<Currency>("EUR")
  const [category, setCategory] = useState(categories[0])
  const [description, setDescription] = useState("")
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates>({ EUR: 1, USD: 1, VND: 1 })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchExchangeRates = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("https://api.exchangerate-api.com/v4/latest/EUR")
        const data = await response.json()
        setExchangeRates({
          EUR: 1,
          USD: data.rates.USD,
          VND: data.rates.VND,
        })
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error)
        toast.error("Failed to fetch exchange rates. Using default values.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchExchangeRates()
    const intervalId = setInterval(fetchExchangeRates, 3600000) // Refresh every hour

    return () => clearInterval(intervalId)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || isNaN(Number.parseFloat(amount))) {
      toast.error("Please enter a valid amount")
      return
    }
    const newExpense: Expense = {
      id: Date.now(),
      amount: Number.parseFloat(amount),
      currency,
      category,
      description,
    }
    setExpenses((prevExpenses) => [...prevExpenses, newExpense])
    setAmount("")
    setDescription("")
    toast.success("Expense added successfully!")
  }

  const convertToVND = (amount: number, fromCurrency: Currency) => {
    const euroAmount = fromCurrency === "EUR" ? amount : amount / exchangeRates[fromCurrency]
    return Math.round(euroAmount * exchangeRates.VND)
  }

  const convertToEUR = (amount: number, fromCurrency: Currency) => {
    return fromCurrency === "EUR" ? amount : amount / exchangeRates[fromCurrency]
  }

  const categorySums = useMemo(() => {
    const sums: Record<string, CategorySum> = {}
    expenses.forEach((expense) => {
      if (!sums[expense.category]) {
        sums[expense.category] = { EUR: 0, USD: 0, VND: 0 }
      }
      sums[expense.category][expense.currency] += expense.amount
      sums[expense.category].VND += convertToVND(expense.amount, expense.currency)
    })
    return sums
  }, [expenses, exchangeRates, convertToVND]) // Added convertToVND to dependencies

  const totalSum = useMemo(() => {
    const total: CategorySum = { EUR: 0, USD: 0, VND: 0 }
    Object.values(categorySums).forEach((categorySum) => {
      total.EUR += categorySum.EUR
      total.USD += categorySum.USD
      total.VND += categorySum.VND
    })
    return total
  }, [categorySums])

  const renderAmount = (amount: number, currency: Currency) => (
    <span className="font-bold">
      {currencySymbols[currency]}
      {amount.toFixed(2)} {currency}
    </span>
  )

  return (
    <main className="min-h-screen bg-gradient-to-r from-light-purple to-light-pink p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Shared Expense Tracker</h1>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="border rounded p-2"
              required
              step="0.01"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              className="border rounded p-2"
            >
              <option value="EUR">Euro (€)</option>
              <option value="USD">US Dollar ($)</option>
              <option value="VND">Vietnamese Dong (₫)</option>
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded p-2">
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="border rounded p-2 md:col-span-3"
            />
          </div>
          <button
            type="submit"
            className="mt-4 bg-light-purple hover:bg-light-pink text-gray-800 font-bold py-2 px-4 rounded transition-colors duration-200"
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Add Expense"}
          </button>
        </form>

        <div>
          {categories.map((cat) => {
            const categoryExpenses = expenses.filter((expense) => expense.category === cat)
            if (categoryExpenses.length === 0) return null
            const categorySum = categorySums[cat]
            return (
              <div key={cat} className="mb-6">
                <h2 className="text-xl font-semibold mb-2 text-gray-800">{cat}</h2>
                <ul className="space-y-2">
                  {categoryExpenses.map((expense) => (
                    <li key={expense.id} className="bg-gray-100 rounded p-3 flex justify-between items-center">
                      <span>{expense.description}</span>
                      <div className="text-right">
                        {renderAmount(expense.amount, expense.currency)}
                        <br />
                        <span className="text-sm text-gray-600">
                          (₫{convertToVND(expense.amount, expense.currency).toLocaleString()} VND)
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-right font-bold text-gray-800">
                  Category Total:
                  <br />
                  {renderAmount(categorySum.EUR, "EUR")}
                  <br />
                  {renderAmount(categorySum.VND, "VND")}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-right">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Total Expenses:</h2>
          {renderAmount(totalSum.EUR, "EUR")}
          <br />
          {renderAmount(totalSum.VND, "VND")}
        </div>
      </div>
      <ToastContainer position="bottom-right" />
    </main>
  )
}

