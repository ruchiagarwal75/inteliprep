import type { VisitorCountryMetrics } from "@/lib/admin-visitor-countries";
import { AdminTime } from "@/components/admin-format";

const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

export function AdminVisitorCountries({
  data,
}: {
  data: VisitorCountryMetrics;
}) {
  return (
    <section aria-label="Account countries" className="mt-5 border-t pt-4">
      <h3 className="font-semibold">Countries</h3>
      {data.status === "unavailable" ? (
        <p className="mt-2 text-sm">
          Country reporting unavailable. Check the visitor tracking migration.
        </p>
      ) : (
        <>
          {data.countries.length ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Guest and registered accounts by first known connection
                  country
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="py-2">
                      Country
                    </th>
                    <th scope="col">Guest accounts</th>
                    <th scope="col">Registered accounts</th>
                  </tr>
                </thead>
                <tbody>
                  {data.countries.map((country) => (
                    <tr
                      key={country.countryCode ?? "unknown"}
                      className="border-t"
                    >
                      <th scope="row" className="py-2 font-normal">
                        {country.countryCode
                          ? (countryNames.of(country.countryCode) ??
                            country.countryCode)
                          : "Unknown"}
                      </th>
                      <td>{country.guests}</td>
                      <td>{country.accounts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm">
              No accounts recorded with country tracking yet.
            </p>
          )}
          {data.trackingSince && (
            <p className="mt-2 text-sm">
              Tracking since <AdminTime value={data.trackingSince} />. Earlier
              accounts appear when they return.
            </p>
          )}
        </>
      )}
      <p className="mt-2 text-sm">
        Country is estimated from the connection when first available. VPNs and
        proxies can affect it. Guest accounts are counted separately from
        registered accounts.
      </p>
    </section>
  );
}
