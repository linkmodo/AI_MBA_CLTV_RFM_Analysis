# AI-Powered CLTV & RFM Analysis Dashboard

A comprehensive customer analytics dashboard featuring AI-powered insights for Customer Lifetime Value (CLTV) prediction, RFM (Recency, Frequency, Monetary) segmentation, Market Basket Analysis, and Exploratory Data Analysis.

## 🚀 Features

- **📊 Exploratory Data Analysis (EDA)**: Interactive visualizations of sales trends, top customers, and business metrics
- **🛒 Market Basket Analysis (MBA)**: Discover product associations and cross-selling opportunities using Apriori algorithm
- **👥 RFM Analysis**: Customer segmentation with comprehensive distribution metrics and segment analysis
- **💰 CLTV Prediction**: Advanced customer lifetime value modeling with customizable parameters
- **🤖 AI-Powered Insights**: Gemini AI integration for automated strategic recommendations at each step
- **📈 Advanced Visualizations**: 20+ interactive charts using Recharts library

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Gemini API Key** - Get yours at [Google AI Studio](https://aistudio.google.com/app/apikey)

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/linkmodo/AI_MBA_CLTV_RFM_Analysis.git
   cd AI_MBA_CLTV_RFM_Analysis
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Netlify CLI** (for local development)
   ```bash
   npm install -g netlify-cli
   ```

4. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your Gemini API key
   # GEMINI_API_KEY=your_actual_api_key_here
   ```

5. **Run the development server**
   ```bash
   netlify dev
   ```
   
   This starts both the Vite dev server and Netlify Functions locally.

6. **Open your browser**
   - Navigate to `http://localhost:8888`

## 🔑 Environment Variables

### 🔒 Secure Architecture

This app uses **Netlify Serverless Functions** to keep your API key secure. The key **never reaches the browser**.

### Local Development

Create a `.env` file in the root directory with:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Netlify Deployment

Set the environment variable in Netlify Dashboard:
- Go to: **Site settings** → **Environment variables**
- Add: `GEMINI_API_KEY` with your API key value

**Important**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

📚 **See [SERVERLESS_SETUP.md](./SERVERLESS_SETUP.md) for detailed setup instructions.**

## 📦 Build for Production

```bash
npm run build
```

The production-ready files will be in the `dist/` directory.

## 🎯 Usage

1. **Upload Data**: Start by uploading a CSV file with transaction data
2. **Clean & Map**: Map your columns to required fields and apply data cleaning
3. **EDA**: Explore your data with interactive visualizations
4. **MBA**: Discover product associations and bundling opportunities
5. **RFM Analysis**: Segment customers and analyze distribution metrics
6. **CLTV Prediction**: Calculate customer lifetime value with AI-powered strategies

## 📊 Data Format

Your CSV should include:
- Customer ID
- Invoice/Transaction ID
- Invoice Date
- Product Description
- Quantity
- Unit Price

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with React, TypeScript, and Vite
- Charts powered by Recharts
- AI insights by Google Gemini
- Market Basket Analysis using Apriori algorithm
