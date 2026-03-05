
type Matrix = {
  baseUrl: string;
  token: string;
};
export async function main(matrix_res: Matrix, room: string, body: string) {
  if (!matrix_res.token) {
    throw Error("Sending a message requires an access token.");
  }
  const roomId = await resolveRoomAlias(matrix_res, room);
  const txnId = `${Math.random()}`;
  const resp = await fetch(
    `${matrix_res.baseUrl}/_matrix/client/v3/rooms/${encodeURIComponent(
      roomId,
    )}/send/m.room.message/${txnId}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${matrix_res.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body,
        msgtype: "m.text",
      }),
    },
  );
  if (!resp.ok) {
    throw Error(`Failed to send message: Error HTTP${resp.status}`);
  }
  const eventId = (await resp.json())["event_id"];
  if (typeof eventId !== "string") {
    throw Error(
      `Faulty Matrix server implementation: Server didn't provide event_id for this message.`,
    );
  }
  return eventId;
}

/**
 * Resolves a room alias to a room id.
 * This is basically like resolving a domain name to an IP address.
 */
async function resolveRoomAlias(
  matrix_res: Matrix,
  room: string,
): Promise<string> {
  // Is it already a room ID?
  if (room.startsWith("!")) {
    return room;
  }
  const resp = await fetch(
    `${
      matrix_res.baseUrl
    }/_matrix/client/v3/directory/room/${encodeURIComponent(room)}`,
    {
      headers: {
        Accept: "application/json",
        ...(matrix_res.token && {
          Authorization: `Bearer ${matrix_res.token}`,
        }),
      },
    },
  );
  if (!resp.ok) {
    throw Error(`Failed to resolve room alias: Error HTTP${resp.status}`);
  }
  const roomId = (await resp.json())["room_id"];
  if (typeof roomId !== "string") {
    throw Error(
      `Faulty Matrix server implementation: Server didn't provide room_id for this alias.`,
    );
  }
  return roomId;
}