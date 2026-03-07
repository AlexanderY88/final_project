# 📊 Product Statistics API Documentation

Complete guide for using the flexible product statistics system with various time periods, filtering options, and role-based access control.

## 🎛️ **Time Period Options**

### **Predefined Periods**
- `last_3_months` - Last 3 months from current date
- `last_6_months` - Last 6 months from current date  
- `last_year` - Last 12 months from current date
- `last_2_years` - Last 24 months from current date
- `current_month` - Current calendar month
- `current_year` - Current calendar year
- `custom_range` - Custom date range (requires customStartDate & customEndDate)

### **Grouping Options**
- `day` - Group by daily periods
- `week` - Group by weekly periods
- `month` - Group by monthly periods (default)
- `year` - Group by yearly periods

## 🔐 **Role-Based Access Control**

### **Admin Users**
- ✅ Can view all products statistics
- ✅ Can view all branches statistics 
- ✅ Can compare multiple branches
- ✅ Can filter by any branch ID or branch name

### **Main Branch Users (main_brunch)**
- ✅ Can view all products statistics
- ✅ Can view all branches statistics
- ✅ Can compare multiple branches
- ✅ Can filter by any branch ID or branch name

### **Child Branch Users (user)**
- ✅ Can view statistics for products they created only
- ✅ Can view their own branch statistics
- ❌ Cannot view other branches' data
- ❌ Cannot compare branches

## 📋 **API Endpoints**

### **1. Product Statistics**
```
GET /products/statistics/:productId
```

**Parameters:**
- `timePeriod` - Time period selection (see options above)
- `customStartDate` - Start date for custom range (YYYY-MM-DD)
- `customEndDate` - End date for custom range (YYYY-MM-DD)
- `branchId` - Filter by specific branch ID (admin/main_brunch only)
- `branchName` - Filter by branch name (admin/main_brunch only)
- `groupBy` - Grouping option (day/week/month/year)
- `includeDetails` - Include detailed change history (true/false)

**Example Requests:**
```bash
# Last 6 months, grouped by month
GET /products/statistics/64f8b2c3d1234567890abcde?timePeriod=last_6_months&groupBy=month

# Custom date range with daily grouping
GET /products/statistics/64f8b2c3d1234567890abcde?timePeriod=custom_range&customStartDate=2026-01-01&customEndDate=2026-02-28&groupBy=day

# Filter by specific branch (admin/main_brunch only)
GET /products/statistics/64f8b2c3d1234567890abcde?timePeriod=last_year&branchId=64f8b2c3d1234567890abc01
```

### **2. All Branches Statistics**
```
GET /products/statistics/branches/overview
```

**Parameters:**
- `timePeriod` - Time period selection
- `customStartDate` - Start date for custom range
- `customEndDate` - End date for custom range
- `branchId` - Filter by specific branch ID
- `branchName` - Filter by branch name
- `groupBy` - Grouping option
- `includeProductDetails` - Include product-level details (true/false)

**Example Requests:**
```bash
# Overview of all branches for last 3 months
GET /products/statistics/branches/overview?timePeriod=last_3_months

# Detailed view with product information
GET /products/statistics/branches/overview?timePeriod=current_year&includeProductDetails=true

# Filter specific branch by name
GET /products/statistics/branches/overview?timePeriod=last_6_months&branchName=TechStore%20Downtown
```

### **3. Branch Comparison**
```
GET /products/statistics/branches/compare
```

**Parameters:**
- `branchIds` - Comma-separated list of branch IDs to compare
- `timePeriod` - Time period selection
- `customStartDate` - Start date for custom range
- `customEndDate` - End date for custom range
- `groupBy` - Grouping option

**Example Requests:**
```bash
# Compare 3 branches for last year
GET /products/statistics/branches/compare?branchIds=64f8b2c3d1234567890abc01,64f8b2c3d1234567890abc02,64f8b2c3d1234567890abc03&timePeriod=last_year

# Compare branches with custom date range
GET /products/statistics/branches/compare?branchIds=branch1,branch2&timePeriod=custom_range&customStartDate=2026-01-01&customEndDate=2026-03-31&groupBy=week
```

### **4. Personal Branch Statistics**
```
GET /products/statistics/my-branch
```

**Parameters:**
- `timePeriod` - Time period selection (defaults to last_3_months)
- `customStartDate` - Start date for custom range
- `customEndDate` - End date for custom range
- `groupBy` - Grouping option
- `includeProductDetails` - Include product-level details (true/false)

**Example Requests:**
```bash
# Personal statistics for last 3 months
GET /products/statistics/my-branch

# Personal statistics with weekly grouping
GET /products/statistics/my-branch?timePeriod=last_6_months&groupBy=week&includeProductDetails=true

# Personal statistics for current year
GET /products/statistics/my-branch?timePeriod=current_year&groupBy=month
```

## 📄 **Response Structure**

### **Product Statistics Response**
```json
{
    "message": "Product quantity statistics retrieved successfully",
    "requestedBy": {
        "userId": "64f8b2c3d1234567890abcde",
        "role": "main_brunch",
        "branchName": "Main Branch"
    },
    "statistics": {
        "productInfo": {
            "id": "64f8b2c3d1234567890abcde",
            "title": "Laptop Dell XPS",
            "category": "Electronics",
            "supplier": "Dell Inc.",
            "currentQuantity": 45
        },
        "filterOptions": {
            "timePeriod": "last_6_months",
            "dateRange": {
                "startDate": "2025-09-07T00:00:00.000Z",
                "endDate": "2026-03-31T23:59:59.999Z"
            },
            "groupBy": "month"
        },
        "summary": {
            "totalPeriods": 6,
            "totalChanges": 15,
            "totalIncrease": 85,
            "totalDecrease": 40,
            "netChange": 45,
            "maxQuantity": 50,
            "maxQuantityPeriod": "2026-02",
            "minQuantity": 20,
            "minQuantityPeriod": "2025-10"
        },
        "periodicData": [
            {
                "period": "2025-10",
                "periodDetails": {
                    "year": 2025,
                    "month": 10,
                    "yearMonth": "2025-10"
                },
                "quantity": 20,
                "quantityAtStart": 0,
                "totalChanges": 1,
                "totalIncrease": 20,
                "totalDecrease": 0,
                "netChange": 20,
                "changes": [
                    {
                        "date": "2025-10-15T10:00:00.000Z",
                        "previousQuantity": 0,
                        "newQuantity": 20,
                        "change": 20,
                        "changedBy": "John Smith",
                        "branchName": "Main Branch",
                        "changeType": "initial_creation",
                        "notes": "Initial product creation"
                    }
                ]
            }
        ]
    }
}
```

## 🚀 **Usage Examples for Frontend**

### **React Hook Example**
```javascript
const useProductStatistics = (productId, filterOptions = {}) => {
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        const fetchStatistics = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams(filterOptions).toString();
                const response = await fetch(`/api/products/statistics/${productId}?${params}`);
                const data = await response.json();
                setStatistics(data.statistics);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        
        if (productId) {
            fetchStatistics();
        }
    }, [productId, JSON.stringify(filterOptions)]);
    
    return { statistics, loading, error };
};
```

### **Chart.js Integration Example**
```javascript
const formatDataForChart = (periodicData) => {
    return {
        labels: periodicData.map(period => period.period),
        datasets: [
            {
                label: 'Quantity',
                data: periodicData.map(period => period.quantity),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            },
            {
                label: 'Net Change',
                data: periodicData.map(period => period.netChange),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }
        ]
    };
};
```

## ⚙️ **Error Handling**

### **Common Error Responses**
```json
// 400 - Bad Request
{
    "message": "Custom date range requires both start and end dates"
}

// 403 - Forbidden
{
    "message": "Access denied: You can only view statistics for products you created"
}

// 404 - Not Found
{
    "message": "Product not found"
}

// 500 - Server Error
{
    "message": "Server error during statistics retrieval"
}
```