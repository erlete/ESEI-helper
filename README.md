# ESEI-helper

A Whatsapp bot developed by and for the ESEI's students.

## Installation

_Note: this package requires Node >= v16.0 and Node Package Manager >= v8.3._

```bash
git clone https://github.com/erlete/ESEI-helper/
cd ESEI-helper/
npm install
```

## Setup (authentication)

A `.env` file must be created in the package's directory. It must contain the following lines (among others):

```
MOOVI_USERNAME=<your Moovi username>
MOOVI_PASSWORD=<your Moovi passowrd>
GROUP_ID=<the id of the main communications' group>
```

_Note that this `.env` file is ignored by the repository, completely local and safe to use. Your data is not used remotely for a purpose other than logging into Moovi and retrieving your personal calendar's data. Feel free to inspect the `mooviFunctions.js` file if you feel insecure about this._

Both `MOOVI_USERNAME` and `MOOVI_PASSWORD` parameters must not contain spaces (not even next to the equal signs) and/or quotes. If, somehow, your password contains quotes... well... we just don't know what to do about that, sorry for the inconvenience.

Furthermore, the `GROUP_ID` parameter must follow a structure such as `<sequence of integer values>@g.us`. Example: `120363041742445195@g.us`.
