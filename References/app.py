import os

from cs50 import SQL
from flask import Flask, flash, redirect, render_template, request, session
from flask_session import Session
from werkzeug.security import check_password_hash, generate_password_hash

from helpers import apology, login_required, lookup, usd

# Configure application
app = Flask(__name__)

# Custom filter
app.jinja_env.filters["usd"] = usd

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Configure CS50 Library to use SQLite database
db = SQL("sqlite:///finance.db")


@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


@app.route("/")
@login_required
def index():
    portfolio = []
    userId = session["user_id"]
    stocks = db.execute("SELECT UPPER(stock_symbol) as stock_symbol, SUM(shares) AS shares, SUM(shares * stock_price) AS total FROM user_stocks us WHERE user_id = (?) GROUP BY us.user_id, UPPER(us.stock_symbol)", userId)
    userCurrentCashBalance = db.execute("SELECT cash FROM users WHERE id = (?)", session["user_id"])[0]['cash']
    userStockBalance = 0

    for stock in stocks:
        userStockBalance += stock['total']

        stockSymbol = stock['stock_symbol']
        shares = stock['shares']
        currentPrice = lookup(stock['stock_symbol'])['price']
        total = usd((stock['total']))

        portfolio.append({
        'stockSymbol': stockSymbol,
        'shares': shares,
        'currentPrice': currentPrice,
        'total': total
        })

    userTotalBalance = usd(userCurrentCashBalance + userStockBalance)

    return render_template("index.html", userStocks=portfolio, userCurrentCashBalance=usd(userCurrentCashBalance), userTotalBalance=userTotalBalance)
    # return apology("Please Log in")

@app.route("/buy", methods=["GET", "POST"])
@login_required
def buy():
    if request.method == "POST":

        try:
            shares = int(request.form.get("shares"))
        except ValueError:
            return apology("Type in a valid number", 400)

        if not request.form.get("symbol") or lookup(request.form.get("symbol")) is None:
            return apology("Please enter a valid symbol", 400)
        if request.form.get("shares") == '' or int(request.form.get("shares")) < 1:
            return apology("Type in a valid number", 400)

        symbol = request.form.get("symbol")
        wantedShares = int(request.form.get("shares"))
        apiReturn = lookup(symbol)
        userCurrentCashBalance = db.execute("SELECT cash FROM users WHERE id = (?)", session["user_id"])[0]['cash']


        totalValue = int(wantedShares * apiReturn['price'])

        if totalValue > userCurrentCashBalance:
            return apology("Insufficient funds")

        userCurrentCashBalance -= totalValue

        db.execute("UPDATE users SET cash = (?) WHERE id = (?)", userCurrentCashBalance, session["user_id"])
        db.execute("INSERT INTO user_stocks (user_id, stock_symbol, shares, stock_price) VALUES (?, ?, ?, ?)", session["user_id"], apiReturn["symbol"].upper(), wantedShares, apiReturn["price"])
        db.execute("INSERT INTO transactions (user_id, stock_symbol, price, shares, total) VALUES (?, ?, ?, ?, ?)", session["user_id"], apiReturn["symbol"].upper(), apiReturn["price"], wantedShares, totalValue)

        return redirect("/")

    return render_template("buy.html")



@app.route("/history")
@login_required
def history():

    userId = session["user_id"]
    transactions = db.execute("SELECT * FROM transactions WHERE user_id = (?)", userId)

    return render_template("history.html", transactions=transactions)


@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # Forget any user_id
    session.clear()

    # User reached route via POST (as by submitting a form via POST)
    if request.method == "POST":
        # Ensure username was submitted
        if not request.form.get("username"):
            return apology("must provide username", 403)

        # Ensure password was submitted
        elif not request.form.get("password"):
            return apology("must provide password", 403)

        # Query database for username
        rows = db.execute(
            "SELECT * FROM users WHERE username = ?", request.form.get("username")
        )

        # Ensure username exists and password is correct
        if len(rows) != 1 or not check_password_hash(
            rows[0]["hash"], request.form.get("password")
        ):
            return apology("invalid username and/or password", 403)

        # Remember which user has logged in
        session["user_id"] = rows[0]["id"]

        # Redirect user to home page
        return redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return render_template("login.html")


@app.route("/logout")
def logout():
    """Log user out"""

    # Forget any user_id
    session.clear()

    # Redirect user to login form
    return redirect("/")


@app.route("/quote", methods=["GET", "POST"])
@login_required
def quote():
    if request.method == "POST":
        stockName = request.form.get("symbol")
        if not stockName or stockName is None or stockName == []:
            return apology("Please enter a valid symbol", 400)

        stockInfo = lookup(stockName)

        if not request.form.get("symbol") or stockInfo is None or stockInfo == []:
            return apology("Please enter a valid symbol", 400)

        stockPrice = usd(stockInfo['price'])
        stockSymbol = stockInfo['symbol']


        if not stockName or stockInfo is None:
            return apology("Please inform the correct stock symbol", 400)
        return render_template("/quoted.html", stockPrice=stockPrice, stockSymbol=stockSymbol)

    return render_template("/quote.html")


@app.route("/quoted", methods=["GET", "POST"])
@login_required
def quoted():
    return render_template("/quoted.html")
    """Get stock quote."""
    return apology("TODO")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        confirmation = request.form.get("confirmation")

        userExists = db.execute("SELECT * FROM users WHERE username = (?)", username)

        if userExists != []:
             return apology("Username already in use", 400)
        if not  username or not password:
            return apology("Please inform an username and a password", 400)
        if password != confirmation:
            return apology("Passwords don't match", 400)

        hashedPassword = generate_password_hash(password, method='pbkdf2', salt_length=16)

        db.execute("INSERT INTO users (username, hash) VALUES(?, ?)", username, hashedPassword)

    return render_template("register.html")


@app.route("/sell", methods=["GET", "POST"])
@login_required
def sell():
    if request.method == "POST":
        ticker = request.form.get("symbol")
        shares = request.form.get("shares")
        userStockBalance = db.execute("SELECT stock_symbol, SUM(shares) AS shares FROM user_stocks WHERE user_id = (?) AND stock_symbol = (?) GROUP BY stock_symbol", session["user_id"], ticker)
        apiReturn = lookup(ticker)

        if int(userStockBalance[0]['shares']) < int(shares):
            return apology('Insufficient shares', 400)

        if request.form.get("shares") == '' or int(request.form.get("shares")) < 1:
            return apology("Type in a valid number", 400)

        if userStockBalance == []:
            return apology("No stocks found with this ticker")

        try:
            int(shares)
        except:
            return apology("Invalid share number: float", 400)

        if int(shares) < 1 :
            return apology("Invalid share number", 400)
#
        userCurrentCashBalance = db.execute("SELECT cash FROM users WHERE id = (?)", session["user_id"])[0]['cash']

        # Add money
        totalValue = int(shares) * apiReturn['price']
        userCurrentCashBalance += totalValue
        db.execute("UPDATE users SET cash = (?) WHERE id = (?)", userCurrentCashBalance, session["user_id"])

        # Select stocks in db
        userStocks = db.execute("SELECT * FROM user_stocks WHERE user_id = (?) AND stock_symbol = (?)", session["user_id"], ticker)

        # for each row
        totalValue = int(shares) * apiReturn["price"]
        tempShares = int(shares)
        for row in userStocks:
            print('-----------------')
            print(row)
            print(tempShares)
            # update number of shares to be subtracted
            if tempShares >= row['shares']:
                tempShares -= row['shares']
                # delete row
                db.execute("DELETE FROM user_stocks WHERE id = (?)", row['id'])
            else:
                rowUpdate = row['shares'] - tempShares
                db.execute("UPDATE user_stocks SET shares = (?) WHERE id = (?)", rowUpdate, row['id'])
                tempShares = 0

            # if shares to be subtracted < 1
            if tempShares < 1:
                # break
                db.execute("INSERT INTO transactions (user_id, stock_symbol, price, shares, total, type) VALUES (?, ?, ?, ?, ?, ?)", session["user_id"], ticker.upper(), apiReturn["price"], int(shares), totalValue, 'sell')
                return redirect("/")


    ownedStocks = db.execute("SELECT * FROM user_stocks WHERE user_id = (?) GROUP BY stock_symbol", session["user_id"])
    return render_template("sell.html", stocks=ownedStocks)

